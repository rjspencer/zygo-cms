use std::collections::{HashMap, HashSet};
use minijinja::machinery::ast::{CallArg, Expr, Stmt};
use serde::{Deserialize, Serialize};

use crate::models::section_template::SectionTemplateField;

const ALLOWED_FIELD_TYPES: &[&str] = &[
    "text", "textarea", "richtext", "url", "boolean", "image", "select", "list",
];

const BUILTIN_WHITELIST: &[&str] = &[
    "loop", "self", "super", "range", "dict", "lipsum", "cycler", "joiner", "true", "false",
    "none", "True", "False", "None",
];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(default)]
pub struct TemplateValidationResult {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

pub trait TemplateSchema {
    fn to_fields(&self) -> Result<Vec<SectionTemplateField>, String>;
}

impl TemplateSchema for &[SectionTemplateField] {
    fn to_fields(&self) -> Result<Vec<SectionTemplateField>, String> {
        Ok(self.to_vec())
    }
}

impl TemplateSchema for &Vec<SectionTemplateField> {
    fn to_fields(&self) -> Result<Vec<SectionTemplateField>, String> {
        Ok((*self).clone())
    }
}

impl TemplateSchema for &str {
    fn to_fields(&self) -> Result<Vec<SectionTemplateField>, String> {
        serde_json::from_str(self).map_err(|e| e.to_string())
    }
}

impl TemplateSchema for &String {
    fn to_fields(&self) -> Result<Vec<SectionTemplateField>, String> {
        self.as_str().to_fields()
    }
}

struct SubFieldState {
    used: bool,
}

struct FieldState {
    field: SectionTemplateField,
    used: bool,
    subfields: HashMap<String, SubFieldState>,
}

struct Scope {
    /// Maps variable name -> Some(list_field_name) if bound to a list loop
    locals: HashMap<String, Option<String>>,
}

struct ScopeStack {
    scopes: Vec<Scope>,
}

impl ScopeStack {
    fn new() -> Self {
        Self {
            scopes: vec![Scope {
                locals: HashMap::new(),
            }],
        }
    }

    fn push(&mut self) {
        self.scopes.push(Scope {
            locals: HashMap::new(),
        });
    }

    fn pop(&mut self) {
        if self.scopes.len() > 1 {
            self.scopes.pop();
        }
    }

    fn add_local(&mut self, name: &str, list_binding: Option<String>) {
        if let Some(scope) = self.scopes.last_mut() {
            scope.locals.insert(name.to_string(), list_binding);
        }
    }

    fn is_local(&self, name: &str) -> bool {
        for scope in self.scopes.iter().rev() {
            if scope.locals.contains_key(name) {
                return true;
            }
        }
        false
    }

    fn get_list_binding(&self, name: &str) -> Option<String> {
        for scope in self.scopes.iter().rev() {
            if let Some(binding) = scope.locals.get(name) {
                return binding.clone();
            }
        }
        None
    }
}

fn extract_target_vars(expr: &Expr) -> Vec<String> {
    let mut vars = Vec::new();
    match expr {
        Expr::Var(v) => {
            vars.push(v.id.to_string());
        }
        Expr::List(l) => {
            for item in &l.items {
                vars.extend(extract_target_vars(item));
            }
        }
        _ => {}
    }
    vars
}

struct Validator<'a> {
    field_states: HashMap<String, FieldState>,
    schema_fields: &'a [SectionTemplateField],
    errors: Vec<String>,
    warnings: Vec<String>,
    scope_stack: ScopeStack,
    builtin_whitelist: HashSet<&'static str>,
}

impl<'a> Validator<'a> {
    fn new(schema_fields: &'a [SectionTemplateField]) -> Self {
        let mut field_states = HashMap::new();
        for field in schema_fields {
            let mut subfields = HashMap::new();
            if let Some(ref subs) = field.fields {
                for sub in subs {
                    subfields.insert(sub.name.clone(), SubFieldState { used: false });
                }
            }
            field_states.insert(
                field.name.clone(),
                FieldState {
                    field: field.clone(),
                    used: false,
                    subfields,
                },
            );
        }

        let builtin_whitelist = BUILTIN_WHITELIST.iter().copied().collect();

        Self {
            field_states,
            schema_fields,
            errors: Vec::new(),
            warnings: Vec::new(),
            scope_stack: ScopeStack::new(),
            builtin_whitelist,
        }
    }

    fn validate_schema(&mut self) {
        let mut seen_field_names = HashSet::new();

        for field in self.schema_fields {
            let trimmed_name = field.name.trim();
            if trimmed_name.is_empty() {
                self.errors.push("Field is missing a name".to_string());
            } else if !seen_field_names.insert(trimmed_name.to_string()) {
                self.errors
                    .push(format!("Duplicate field name '{}'", field.name));
            }

            if !ALLOWED_FIELD_TYPES.contains(&field.r#type.as_str()) {
                self.errors.push(format!(
                    "Unknown field type '{}' for field '{}'",
                    field.r#type, field.name
                ));
            }

            if field.r#type == "select" {
                let has_options = field
                    .options
                    .as_ref()
                    .map_or(false, |opts| !opts.is_empty());
                if !has_options {
                    self.errors.push(format!(
                        "Select field '{}' must have at least one option",
                        field.name
                    ));
                }
            }

            if field.r#type == "list" {
                let subs = field.fields.as_deref().unwrap_or(&[]);
                if subs.is_empty() {
                    self.errors.push(format!(
                        "List field '{}' must have at least one sub-field",
                        field.name
                    ));
                } else {
                    let mut seen_sub_names = HashSet::new();
                    for sub in subs {
                        let trimmed_sub_name = sub.name.trim();
                        if trimmed_sub_name.is_empty() {
                            self.errors.push(format!(
                                "Sub-field in list '{}' is missing a name",
                                field.name
                            ));
                        } else if !seen_sub_names.insert(trimmed_sub_name.to_string()) {
                            self.errors.push(format!(
                                "Duplicate sub-field name '{}' in list '{}'",
                                sub.name, field.name
                            ));
                        }

                        if sub.r#type == "list" {
                            self.errors.push(format!(
                                "Nested list fields are not allowed in list field '{}'",
                                field.name
                            ));
                        } else if !ALLOWED_FIELD_TYPES.contains(&sub.r#type.as_str()) {
                            self.errors.push(format!(
                                "Unknown field type '{}' for sub-field '{}' in list '{}'",
                                sub.r#type, sub.name, field.name
                            ));
                        }

                        if sub.r#type == "select" {
                            let sub_has_options = sub
                                .options
                                .as_ref()
                                .map_or(false, |opts| !opts.is_empty());
                            if !sub_has_options {
                                self.errors.push(format!(
                                    "Select sub-field '{}' in list '{}' must have at least one option",
                                    sub.name, field.name
                                ));
                            }
                        }
                    }
                }
            }
        }
    }

    fn visit_stmt(&mut self, stmt: &Stmt) {
        match stmt {
            Stmt::Template(t) => {
                for child in &t.children {
                    self.visit_stmt(child);
                }
            }
            Stmt::EmitExpr(e) => {
                self.visit_expr(&e.expr);
            }
            Stmt::EmitRaw(_) => {}
            Stmt::ForLoop(f) => {
                // Determine if iterating over a list field
                let mut list_binding = None;
                if let Expr::Var(v) = &f.iter {
                    if let Some(state) = self.field_states.get(v.id) {
                        if state.field.r#type == "list" {
                            list_binding = Some(v.id.to_string());
                        }
                    }
                }

                // Visit the iterator expression
                self.visit_expr(&f.iter);

                self.scope_stack.push();
                let target_vars = extract_target_vars(&f.target);
                if target_vars.len() == 1 && list_binding.is_some() {
                    self.scope_stack.add_local(&target_vars[0], list_binding);
                } else {
                    for var in &target_vars {
                        self.scope_stack.add_local(var, None);
                    }
                }
                self.scope_stack.add_local("loop", None);

                if let Some(ref filter) = f.filter_expr {
                    self.visit_expr(filter);
                }

                for body_stmt in &f.body {
                    self.visit_stmt(body_stmt);
                }

                self.scope_stack.pop();

                for else_stmt in &f.else_body {
                    self.visit_stmt(else_stmt);
                }
            }
            Stmt::IfCond(i) => {
                self.visit_expr(&i.expr);
                for body_stmt in &i.true_body {
                    self.visit_stmt(body_stmt);
                }
                for else_stmt in &i.false_body {
                    self.visit_stmt(else_stmt);
                }
            }
            Stmt::WithBlock(w) => {
                self.scope_stack.push();
                for (target, expr) in &w.assignments {
                    self.visit_expr(expr);
                    for var in extract_target_vars(target) {
                        self.scope_stack.add_local(&var, None);
                    }
                }
                for body_stmt in &w.body {
                    self.visit_stmt(body_stmt);
                }
                self.scope_stack.pop();
            }
            Stmt::Set(s) => {
                self.visit_expr(&s.expr);
                for var in extract_target_vars(&s.target) {
                    self.scope_stack.add_local(&var, None);
                }
            }
            Stmt::SetBlock(s) => {
                if let Some(ref filter) = s.filter {
                    self.visit_expr(filter);
                }
                for body_stmt in &s.body {
                    self.visit_stmt(body_stmt);
                }
                for var in extract_target_vars(&s.target) {
                    self.scope_stack.add_local(&var, None);
                }
            }
            Stmt::AutoEscape(a) => {
                for body_stmt in &a.body {
                    self.visit_stmt(body_stmt);
                }
            }
            Stmt::FilterBlock(f) => {
                self.visit_expr(&f.filter);
                for body_stmt in &f.body {
                    self.visit_stmt(body_stmt);
                }
            }
            Stmt::Block(b) => {
                for body_stmt in &b.body {
                    self.visit_stmt(body_stmt);
                }
            }
            Stmt::Macro(m) => {
                self.scope_stack.add_local(m.name, None);
                self.scope_stack.push();
                for arg in &m.args {
                    for var in extract_target_vars(arg) {
                        self.scope_stack.add_local(&var, None);
                    }
                }
                for def in &m.defaults {
                    self.visit_expr(def);
                }
                for body_stmt in &m.body {
                    self.visit_stmt(body_stmt);
                }
                self.scope_stack.pop();
            }
            Stmt::CallBlock(c) => {
                self.visit_expr(&c.call.expr);
                for arg in &c.call.args {
                    self.visit_call_arg(arg);
                }
                self.scope_stack.push();
                for arg in &c.macro_decl.args {
                    for var in extract_target_vars(arg) {
                        self.scope_stack.add_local(&var, None);
                    }
                }
                for def in &c.macro_decl.defaults {
                    self.visit_expr(def);
                }
                for body_stmt in &c.macro_decl.body {
                    self.visit_stmt(body_stmt);
                }
                self.scope_stack.pop();
            }
            Stmt::Do(d) => {
                self.visit_expr(&d.call.expr);
                for arg in &d.call.args {
                    self.visit_call_arg(arg);
                }
            }
            Stmt::Import(_) | Stmt::FromImport(_) | Stmt::Extends(_) | Stmt::Include(_) => {}
        }
    }

    fn visit_call_arg(&mut self, arg: &CallArg) {
        match arg {
            CallArg::Pos(e) | CallArg::PosSplat(e) | CallArg::KwargSplat(e) => {
                self.visit_expr(e);
            }
            CallArg::Kwarg(_, e) => {
                self.visit_expr(e);
            }
        }
    }

    fn visit_expr(&mut self, expr: &Expr) {
        match expr {
            Expr::Var(v) => {
                if self.builtin_whitelist.contains(v.id) {
                    return;
                }
                if self.scope_stack.is_local(v.id) {
                    return;
                }
                if let Some(state) = self.field_states.get_mut(v.id) {
                    state.used = true;
                } else {
                    self.errors.push(format!(
                        "Top-level variable '{}' is used in template HTML but not defined in schema",
                        v.id
                    ));
                }
            }
            Expr::GetAttr(g) => {
                if let Expr::Var(base_var) = &g.expr {
                    if let Some(list_name) = self.scope_stack.get_list_binding(base_var.id) {
                        let subfield_name = g.name;
                        if let Some(state) = self.field_states.get_mut(&list_name) {
                            if let Some(sub_state) = state.subfields.get_mut(subfield_name) {
                                sub_state.used = true;
                            } else {
                                self.warnings.push(format!(
                                    "Sub-field '{}' used on '{}' is not defined in schema for list field '{}'",
                                    subfield_name, base_var.id, list_name
                                ));
                            }
                        }
                        return;
                    }
                }
                self.visit_expr(&g.expr);
            }
            Expr::GetItem(g) => {
                if let Expr::Var(base_var) = &g.expr {
                    if let Some(list_name) = self.scope_stack.get_list_binding(base_var.id) {
                        if let Expr::Const(c) = &g.subscript_expr {
                            if let Some(subfield_name) = c.value.as_str() {
                                if let Some(state) = self.field_states.get_mut(&list_name) {
                                    if let Some(sub_state) = state.subfields.get_mut(subfield_name) {
                                        sub_state.used = true;
                                    } else {
                                        self.warnings.push(format!(
                                            "Sub-field '{}' used on '{}' is not defined in schema for list field '{}'",
                                            subfield_name, base_var.id, list_name
                                        ));
                                    }
                                }
                                return;
                            }
                        }
                        self.visit_expr(&g.subscript_expr);
                        return;
                    }
                }
                self.visit_expr(&g.expr);
                self.visit_expr(&g.subscript_expr);
            }
            Expr::BinOp(b) => {
                self.visit_expr(&b.left);
                self.visit_expr(&b.right);
            }
            Expr::UnaryOp(u) => {
                self.visit_expr(&u.expr);
            }
            Expr::Compare(c) => {
                self.visit_expr(&c.expr);
                for op in &c.ops {
                    self.visit_expr(&op.expr);
                }
            }
            Expr::IfExpr(i) => {
                self.visit_expr(&i.test_expr);
                self.visit_expr(&i.true_expr);
                if let Some(ref f) = i.false_expr {
                    self.visit_expr(f);
                }
            }
            Expr::Filter(f) => {
                if let Some(ref e) = f.expr {
                    self.visit_expr(e);
                }
                for arg in &f.args {
                    self.visit_call_arg(arg);
                }
            }
            Expr::Test(t) => {
                self.visit_expr(&t.expr);
                for arg in &t.args {
                    self.visit_call_arg(arg);
                }
            }
            Expr::Call(c) => {
                self.visit_expr(&c.expr);
                for arg in &c.args {
                    self.visit_call_arg(arg);
                }
            }
            Expr::List(l) => {
                for item in &l.items {
                    self.visit_expr(item);
                }
            }
            Expr::Map(m) => {
                for (k, v) in m.keys.iter().zip(m.values.iter()) {
                    self.visit_expr(k);
                    self.visit_expr(v);
                }
            }
            Expr::Slice(s) => {
                self.visit_expr(&s.expr);
                if let Some(ref start) = s.start {
                    self.visit_expr(start);
                }
                if let Some(ref stop) = s.stop {
                    self.visit_expr(stop);
                }
                if let Some(ref step) = s.step {
                    self.visit_expr(step);
                }
            }
            Expr::Const(_) => {}
        }
    }

    fn collect_warnings(&mut self) {
        for field in self.schema_fields {
            if let Some(state) = self.field_states.get(&field.name) {
                if !state.used {
                    self.warnings.push(format!(
                        "Schema field '{}' is defined in schema but never used in template HTML",
                        field.name
                    ));
                }
                if let Some(ref subs) = field.fields {
                    for sub in subs {
                        if let Some(sub_state) = state.subfields.get(&sub.name) {
                            if !sub_state.used {
                                self.warnings.push(format!(
                                    "Sub-field '{}' of list field '{}' is defined in schema but never used in template HTML",
                                    sub.name, field.name
                                ));
                            }
                        }
                    }
                }
            }
        }
    }
}

pub fn validate_template<S: TemplateSchema>(
    template_html: &str,
    schema: S,
) -> TemplateValidationResult {
    let schema_fields = match schema.to_fields() {
        Ok(fields) => fields,
        Err(err) => {
            return TemplateValidationResult {
                is_valid: false,
                errors: vec![format!("Invalid JSON schema: {}", err)],
                warnings: Vec::new(),
            };
        }
    };

    let mut validator = Validator::new(&schema_fields);
    validator.validate_schema();

    let ast = match minijinja::machinery::parse(
        template_html,
        "<template>",
        Default::default(),
        Default::default(),
    ) {
        Ok(ast) => ast,
        Err(err) => {
            validator
                .errors
                .push(format!("MiniJinja syntax error: {}", err));
            return TemplateValidationResult {
                is_valid: false,
                errors: validator.errors,
                warnings: validator.warnings,
            };
        }
    };

    validator.visit_stmt(&ast);
    validator.collect_warnings();

    TemplateValidationResult {
        is_valid: validator.errors.is_empty(),
        errors: validator.errors,
        warnings: validator.warnings,
    }
}

pub fn validate_template_fields(
    template_html: &str,
    fields: &[SectionTemplateField],
) -> TemplateValidationResult {
    validate_template(template_html, fields)
}

pub fn validate_template_json(
    template_html: &str,
    schema_json: &str,
) -> TemplateValidationResult {
    validate_template(template_html, schema_json)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_template_and_schema() {
        let schema_json = r#"[
            { "name": "title", "type": "text", "label": "Title" },
            { "name": "author", "type": "text", "label": "Author" }
        ]"#;
        let html = "<h1>{{ title }}</h1><p>By {{ author }}</p>";
        let result = validate_template(html, schema_json);
        assert!(result.is_valid);
        assert!(result.errors.is_empty());
        assert!(result.warnings.is_empty());
    }

    #[test]
    fn test_syntax_error_in_html() {
        let schema_json = r#"[ { "name": "title", "type": "text" } ]"#;
        let html = "<h1>{{ title }";
        let result = validate_template(html, schema_json);
        assert!(!result.is_valid);
        assert!(!result.errors.is_empty());
        assert!(result.errors[0].contains("MiniJinja syntax error"));
    }

    #[test]
    fn test_unknown_top_level_variable() {
        let schema_json = r#"[ { "name": "title", "type": "text" } ]"#;
        let html = "<h1>{{ title }}</h1><p>{{ unknown_var }}</p>";
        let result = validate_template(html, schema_json);
        assert!(!result.is_valid);
        assert_eq!(
            result.errors,
            vec!["Top-level variable 'unknown_var' is used in template HTML but not defined in schema"]
        );
    }

    #[test]
    fn test_unused_schema_field_warning() {
        let schema_json = r#"[
            { "name": "title", "type": "text" },
            { "name": "subtitle", "type": "text" }
        ]"#;
        let html = "<h1>{{ title }}</h1>";
        let result = validate_template(html, schema_json);
        assert!(result.is_valid);
        assert!(result.errors.is_empty());
        assert_eq!(
            result.warnings,
            vec!["Schema field 'subtitle' is defined in schema but never used in template HTML"]
        );
    }

    #[test]
    fn test_list_and_subfields_usage() {
        let schema_json = r#"[
            {
                "name": "features",
                "type": "list",
                "fields": [
                    { "name": "headline", "type": "text" },
                    { "name": "icon", "type": "text" }
                ]
            }
        ]"#;
        let html = r#"
            {% for item in features %}
                <div>{{ item.headline }} - {{ item["icon"] }}</div>
            {% endfor %}
        "#;
        let result = validate_template(html, schema_json);
        assert!(result.is_valid);
        assert!(result.errors.is_empty());
        assert!(result.warnings.is_empty());
    }

    #[test]
    fn test_list_unused_subfield_warning() {
        let schema_json = r#"[
            {
                "name": "features",
                "type": "list",
                "fields": [
                    { "name": "headline", "type": "text" },
                    { "name": "icon", "type": "text" }
                ]
            }
        ]"#;
        let html = r#"
            {% for item in features %}
                <div>{{ item.headline }}</div>
            {% endfor %}
        "#;
        let result = validate_template(html, schema_json);
        assert!(result.is_valid);
        assert!(result.errors.is_empty());
        assert_eq!(
            result.warnings,
            vec!["Sub-field 'icon' of list field 'features' is defined in schema but never used in template HTML"]
        );
    }

    #[test]
    fn test_list_undeclared_subfield_warning() {
        let schema_json = r#"[
            {
                "name": "features",
                "type": "list",
                "fields": [
                    { "name": "headline", "type": "text" }
                ]
            }
        ]"#;
        let html = r#"
            {% for item in features %}
                <div>{{ item.headline }} - {{ item.nonexistent }}</div>
            {% endfor %}
        "#;
        let result = validate_template(html, schema_json);
        assert!(result.is_valid);
        assert!(result.errors.is_empty());
        assert_eq!(
            result.warnings,
            vec!["Sub-field 'nonexistent' used on 'item' is not defined in schema for list field 'features'"]
        );
    }

    #[test]
    fn test_schema_rules_validation() {
        // Unknown field type
        let invalid_type = r#"[ { "name": "foo", "type": "invalid_type" } ]"#;
        let res = validate_template("{{ foo }}", invalid_type);
        assert!(!res.is_valid);
        assert!(res.errors.iter().any(|e| e.contains("Unknown field type 'invalid_type' for field 'foo'")));

        // Missing field name
        let missing_name = r#"[ { "name": " ", "type": "text" } ]"#;
        let res = validate_template("", missing_name);
        assert!(!res.is_valid);
        assert!(res.errors.iter().any(|e| e.contains("Field is missing a name")));

        // Select without options
        let select_empty = r#"[ { "name": "opt", "type": "select", "options": [] } ]"#;
        let res = validate_template("{{ opt }}", select_empty);
        assert!(!res.is_valid);
        assert!(res.errors.iter().any(|e| e.contains("Select field 'opt' must have at least one option")));

        // List without fields
        let list_empty = r#"[ { "name": "items", "type": "list", "fields": [] } ]"#;
        let res = validate_template("{{ items }}", list_empty);
        assert!(!res.is_valid);
        assert!(res.errors.iter().any(|e| e.contains("List field 'items' must have at least one sub-field")));

        // Nested list
        let nested_list = r#"[
            {
                "name": "outer",
                "type": "list",
                "fields": [
                    { "name": "inner", "type": "list", "fields": [ { "name": "x", "type": "text" } ] }
                ]
            }
        ]"#;
        let res = validate_template("{{ outer }}", nested_list);
        assert!(!res.is_valid);
        assert!(res.errors.iter().any(|e| e.contains("Nested list fields are not allowed in list field 'outer'")));
    }

    #[test]
    fn test_builtins_and_local_scopes() {
        let schema_json = r#"[ { "name": "items", "type": "list", "fields": [{ "name": "title", "type": "text" }] } ]"#;
        let html = r#"
            {% for item in items %}
                {% if loop.first %}First!{% endif %}
                {{ item.title }}
            {% endfor %}
            {% set my_local = "hello" %}
            <p>{{ my_local }}</p>
            {% with greeting = "hi" %}
                <p>{{ greeting }}</p>
            {% endwith %}
        "#;
        let result = validate_template(html, schema_json);
        assert!(result.is_valid);
        assert!(result.errors.is_empty());
        assert!(result.warnings.is_empty());
    }

    #[test]
    fn test_invalid_json_schema() {
        let result = validate_template("{{ title }}", "not json");
        assert!(!result.is_valid);
        assert!(result.errors[0].contains("Invalid JSON schema"));
    }
}
