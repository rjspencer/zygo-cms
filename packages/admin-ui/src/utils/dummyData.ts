export function generateDummyDataFromSchema(schemaJsonStr: string): string {
  try {
    const schema = JSON.parse(schemaJsonStr);
    if (!Array.isArray(schema)) return '{}';
    
    const dummyObj: Record<string, any> = {};
    
    for (const field of schema) {
      if (!field.name) continue;
      
      switch (field.type) {
        case 'text':
        case 'rich-text':
          dummyObj[field.name] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
          break;
        case 'image':
          dummyObj[field.name] = 'https://placehold.co/600x400';
          break;
        case 'number':
          dummyObj[field.name] = 42;
          break;
        case 'boolean':
          dummyObj[field.name] = true;
          break;
        case 'select':
          dummyObj[field.name] = field.options && field.options.length > 0 ? field.options[0] : 'Option 1';
          break;
        case 'list':
          if (field.fields && Array.isArray(field.fields)) {
            const listObj: Record<string, any> = {};
            for (const sub of field.fields) {
               if (sub.name) {
                 listObj[sub.name] = sub.type === 'image' ? 'https://placehold.co/100x100' : 'List item content';
               }
            }
            dummyObj[field.name] = [listObj, listObj, listObj];
          } else {
            dummyObj[field.name] = [];
          }
          break;
        default:
          dummyObj[field.name] = 'Sample text';
      }
    }
    
    return JSON.stringify(dummyObj);
  } catch (e) {
    return '{}';
  }
}
