import type { SectionTemplate, SectionTemplateField } from '../../../../../../../../types/sectionTemplate';

export const parseTemplateFields = (template?: SectionTemplate | null): SectionTemplateField[] => {
  if (!template || !template.schema_json) {
    return [];
  }

  try {
    const fields =
      typeof template.schema_json === 'string'
        ? JSON.parse(template.schema_json)
        : template.schema_json;
    return Array.isArray(fields) ? fields : [];
  } catch (e) {
    console.error('Failed to parse schema_json for template', template.id, e);
    return [];
  }
};
