import * as fs from 'fs';

const filePath = 'packages/admin-ui/src/pages/Editor.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Imports
content = content.replace(
  `import {\n  Flex,\n  Box,\n  Heading,\n  Text,\n  Button,\n  IconButton,\n  TextField,\n  TextArea,\n  Tabs,\n  Badge,\n  Grid,\n} from '@radix-ui/themes';\nimport {\n  ArrowLeftIcon,\n  CheckIcon,\n  Cross2Icon,\n  Pencil1Icon,\n} from '@radix-ui/react-icons';`,
  `import {\n  Flex,\n  Box,\n  Heading,\n  Text,\n  Button,\n  IconButton,\n  TextField,\n  TextArea,\n  Tabs,\n  Badge,\n  Grid,\n  Switch,\n  Select,\n  Card,\n} from '@radix-ui/themes';\nimport {\n  ArrowLeftIcon,\n  CheckIcon,\n  Cross2Icon,\n  Pencil1Icon,\n  CaretUpIcon,\n  CaretDownIcon,\n  TrashIcon,\n  ChevronDownIcon,\n  ChevronRightIcon\n} from '@radix-ui/react-icons';`
);

// State additions
content = content.replace(
  `const [pickerTarget, setPickerTarget] = useState<'cover' | 'content' | null>(null);`,
  `const [pickerTarget, setPickerTarget] = useState<'cover' | 'content' | { type: 'section', index: number, fieldName: string } | null>(null);\n  const [sections, setSections] = useState<any[]>([]);\n  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});`
);

// Query for content types
const queryInsert = `
  const { data: contentTypes = [] } = useQuery({
    queryKey: ['contentTypes'],
    queryFn: async () => {
      const res = await apiFetch('/api/content-types');
      if (!res.ok) throw new Error('Failed to fetch content types');
      return res.json();
    }
  });
`;
content = content.replace(
  `const handleMediaSelect = (url: string, altText: string) => {`,
  `${queryInsert}\n\n  const handleMediaSelect = (url: string, altText: string) => {`
);

// handleMediaSelect updates
content = content.replace(
  `    } else if (pickerTarget === 'content') {\n      const markdownImage = \`![$\{altText}]($\{url})\`;\n      setContent((prev) => {\n        if (cursorPos !== null && cursorPos >= 0 && cursorPos <= prev.length) {\n          return prev.slice(0, cursorPos) + markdownImage + prev.slice(cursorPos);\n        }\n        return prev + markdownImage;\n      });\n    }\n    setPickerTarget(null);`,
  `    } else if (pickerTarget === 'content') {\n      const markdownImage = \`![$\{altText}]($\{url})\`;\n      setContent((prev) => {\n        if (cursorPos !== null && cursorPos >= 0 && cursorPos <= prev.length) {\n          return prev.slice(0, cursorPos) + markdownImage + prev.slice(cursorPos);\n        }\n        return prev + markdownImage;\n      });\n    } else if (typeof pickerTarget === 'object' && pickerTarget !== null && pickerTarget.type === 'section') {\n      setSections(prev => {\n        const newSections = [...prev];\n        if (newSections[pickerTarget.index]) {\n          newSections[pickerTarget.index] = {\n            ...newSections[pickerTarget.index],\n            data: {\n              ...newSections[pickerTarget.index].data,\n              [pickerTarget.fieldName]: url\n            }\n          };\n        }\n        return newSections;\n      });\n    }\n    setPickerTarget(null);`
);

// entryData useEffect update body_json
content = content.replace(
  `setSchemaJson(entryData.entry.schema_json || '');`,
  `setSchemaJson(entryData.entry.schema_json || '');\n          if (entryData.entry.body_json) {\n            try {\n              const parsed = JSON.parse(entryData.entry.body_json);\n              if (Array.isArray(parsed)) setSections(parsed);\n            } catch (e) {}\n          }`
);

// handleSave update
content = content.replace(
  `      body_html: content,\n      body_json: "{}",`,
  `      body_html: entryType === 'page' ? "" : content,\n      body_json: entryType === 'page' ? JSON.stringify(sections) : "{}",`
);

// UI Branching inside Content Tab
const oldContentBox = `              <Box>\n                <Flex justify="between" align="center" mb="1">\n                  <Text as="label" size="2" weight="bold">\n                    Body Content (Markdown/HTML)\n                  </Text>\n                  <Button\n                    type="button"\n                    size="1"\n                    variant="soft"\n                    color="iris"\n                    onClick={() => setPickerTarget('content')}\n                  >\n                    Insert Image\n                  </Button>\n                </Flex>\n                <TextArea\n                  placeholder="Write your markdown or HTML content here..."\n                  value={content}\n                  onChange={(e) => {\n                    setContent(e.target.value);\n                    setCursorPos(e.target.selectionStart);\n                  }}\n                  onSelect={(e) => setCursorPos(e.currentTarget.selectionStart)}\n                  onClick={(e) => setCursorPos(e.currentTarget.selectionStart)}\n                  onKeyUp={(e) => setCursorPos(e.currentTarget.selectionStart)}\n                  style={{ minHeight: '400px', fontFamily: 'monospace', fontSize: '14px' }}\n                />\n              </Box>`;

const sectionBuilderUI = `
              {entryType === 'post' ? (
${oldContentBox}
              ) : (
                <Box>
                  <Flex justify="between" align="center" mb="4">
                    <Text as="label" size="2" weight="bold">
                      Page Sections
                    </Text>
                    <Select.Root
                      onValueChange={(typeId) => {
                        const ct = contentTypes.find((c: any) => c.id === typeId);
                        setSections([...sections, { type_id: typeId, data: {} }]);
                        setExpandedSections({ ...expandedSections, [sections.length]: true });
                      }}
                    >
                      <Select.Trigger placeholder="Add Section..." />
                      <Select.Content>
                        {contentTypes.map((ct: any) => (
                          <Select.Item key={ct.id} value={ct.id}>
                            {ct.name}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </Flex>

                  <Flex direction="column" gap="3">
                    {sections.map((section, index) => {
                      const ct = contentTypes.find((c: any) => c.id === section.type_id);
                      let fields = [];
                      try {
                        if (ct && ct.schema_json) {
                          fields = JSON.parse(ct.schema_json);
                        }
                      } catch (e) {}

                      const isExpanded = expandedSections[index];

                      return (
                        <Card key={index} variant="surface" style={{ padding: '0' }}>
                          <Flex align="center" justify="between" p="3" style={{ borderBottom: isExpanded ? '1px solid var(--gray-a4)' : 'none', backgroundColor: 'var(--gray-a2)' }}>
                            <Flex align="center" gap="3">
                              <IconButton
                                size="1"
                                variant="ghost"
                                onClick={() => setExpandedSections({ ...expandedSections, [index]: !isExpanded })}
                              >
                                {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                              </IconButton>
                              <Text weight="bold" size="2">
                                {ct ? ct.name : section.type_id}
                              </Text>
                            </Flex>
                            <Flex gap="2">
                              <IconButton
                                size="1"
                                variant="soft"
                                disabled={index === 0}
                                onClick={() => {
                                  const newSections = [...sections];
                                  const temp = newSections[index - 1];
                                  newSections[index - 1] = newSections[index];
                                  newSections[index] = temp;
                                  setSections(newSections);
                                }}
                              >
                                <CaretUpIcon />
                              </IconButton>
                              <IconButton
                                size="1"
                                variant="soft"
                                disabled={index === sections.length - 1}
                                onClick={() => {
                                  const newSections = [...sections];
                                  const temp = newSections[index + 1];
                                  newSections[index + 1] = newSections[index];
                                  newSections[index] = temp;
                                  setSections(newSections);
                                }}
                              >
                                <CaretDownIcon />
                              </IconButton>
                              <IconButton
                                size="1"
                                variant="soft"
                                color="red"
                                onClick={() => {
                                  setSections(sections.filter((_, i) => i !== index));
                                }}
                              >
                                <TrashIcon />
                              </IconButton>
                            </Flex>
                          </Flex>

                          {isExpanded && (
                            <Box p="4">
                              <Flex direction="column" gap="4">
                                {fields.length === 0 ? (
                                  <Text size="2" color="gray">No fields defined in schema.</Text>
                                ) : (
                                  fields.map((field: any) => (
                                    <Box key={field.name}>
                                      <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                                        {field.label || field.name}
                                      </Text>
                                      {field.type === 'boolean' ? (
                                        <Switch
                                          checked={!!section.data[field.name]}
                                          onCheckedChange={(checked) => {
                                            const newSections = [...sections];
                                            newSections[index].data[field.name] = checked;
                                            setSections(newSections);
                                          }}
                                        />
                                      ) : field.type === 'image' ? (
                                        <Flex gap="2" align="center">
                                          <Button
                                            type="button"
                                            variant="soft"
                                            onClick={() => setPickerTarget({ type: 'section', index, fieldName: field.name })}
                                          >
                                            Select Image
                                          </Button>
                                          {section.data[field.name] && (
                                            <Text size="1" color="gray">{section.data[field.name]}</Text>
                                          )}
                                        </Flex>
                                      ) : (
                                        <TextField.Root
                                          value={section.data[field.name] || ''}
                                          onChange={(e) => {
                                            const newSections = [...sections];
                                            newSections[index].data[field.name] = e.target.value;
                                            setSections(newSections);
                                          }}
                                          placeholder={\`Enter \${field.label || field.name}\`}
                                        />
                                      )}
                                    </Box>
                                  ))
                                )}
                              </Flex>
                            </Box>
                          )}
                        </Card>
                      );
                    })}
                  </Flex>
                </Box>
              )}
`;

content = content.replace(oldContentBox, sectionBuilderUI);

fs.writeFileSync(filePath, content);
console.log('Done replacement');
