import { useState, useRef } from 'react';
import { SectionTemplateField } from '../../../types/sectionTemplate';
import { slugify } from '../utils';

export function useVisualFieldBuilder(
  fields: SectionTemplateField[],
  onChange: (fields: SectionTemplateField[]) => void
) {
  const fieldIdMap = useRef(new WeakMap<SectionTemplateField, string>());
  const idCounter = useRef(0);
  const [manuallyEditedIds, setManuallyEditedIds] = useState<Set<string>>(new Set());

  const getFieldId = (f: SectionTemplateField): string => {
    if ((f as any)._builderId) {
      return (f as any)._builderId;
    }
    let id = fieldIdMap.current.get(f);
    if (!id) {
      id = `fld_${++idCounter.current}`;
      fieldIdMap.current.set(f, id);
    }
    try {
      Object.defineProperty(f, '_builderId', {
        value: id,
        enumerable: false,
        writable: true,
        configurable: true,
      });
    } catch {
      // Ignore if non-extensible
    }
    return id;
  };

  const cloneWithId = <T extends SectionTemplateField>(orig: T, update: Partial<T>): T => {
    const cloned = { ...orig, ...update };
    const id = getFieldId(orig);
    fieldIdMap.current.set(cloned, id);
    try {
      Object.defineProperty(cloned, '_builderId', {
        value: id,
        enumerable: false,
        writable: true,
        configurable: true,
      });
    } catch {
      // Ignore if non-extensible
    }
    return cloned;
  };

  const isNameManuallyEdited = (f: SectionTemplateField, id: string): boolean => {
    if (manuallyEditedIds.has(id)) {
      return true;
    }
    // If field already had a custom name differing from slugify(label)
    if (f.name && f.label && f.name !== slugify(f.label)) {
      return true;
    }
    return false;
  };

  const markManuallyEdited = (id: string) => {
    setManuallyEditedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleAddField = () => {
    const newField: SectionTemplateField = {
      name: '',
      type: 'text',
      label: '',
      required: false,
    };
    onChange([...fields, newField]);
  };

  const handleRemoveField = (index: number) => {
    const next = fields.filter((_, i) => i !== index);
    onChange(next);
  };

  const handleUpdateField = (index: number, updatedField: SectionTemplateField) => {
    const next = [...fields];
    next[index] = updatedField;
    onChange(next);
  };

  const handleLabelChange = (index: number, newLabel: string) => {
    const field = fields[index];
    const id = getFieldId(field);
    const manual = isNameManuallyEdited(field, id);
    const newName = manual ? field.name : slugify(newLabel);

    handleUpdateField(
      index,
      cloneWithId(field, {
        label: newLabel,
        name: newName,
      })
    );
  };

  const handleNameChange = (index: number, newName: string) => {
    const field = fields[index];
    const id = getFieldId(field);
    markManuallyEdited(id);
    handleUpdateField(index, cloneWithId(field, { name: newName }));
  };

  const handleTypeChange = (index: number, newType: string) => {
    const field = fields[index];
    const updated: Partial<SectionTemplateField> = { type: newType };

    if (newType === 'select') {
      updated.options = field.options || [];
    } else {
      delete (field as any).options;
    }

    if (newType === 'list') {
      updated.fields = field.fields || [];
    } else {
      delete (field as any).fields;
    }

    handleUpdateField(index, cloneWithId(field, updated));
  };

  const handleRequiredChange = (index: number, checked: boolean) => {
    const field = fields[index];
    handleUpdateField(index, cloneWithId(field, { required: checked }));
  };

  const handleOptionsChange = (index: number, options: string[]) => {
    const field = fields[index];
    handleUpdateField(index, cloneWithId(field, { options }));
  };

  // Subfield handlers
  const handleAddSubfield = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    const currentSubfields = field.fields || [];
    const newSubfield: SectionTemplateField = {
      name: '',
      type: 'text',
      label: '',
      required: false,
    };
    handleUpdateField(
      fieldIndex,
      cloneWithId(field, { fields: [...currentSubfields, newSubfield] })
    );
  };

  const handleRemoveSubfield = (fieldIndex: number, subIndex: number) => {
    const field = fields[fieldIndex];
    const currentSubfields = (field.fields || []).filter((_, i) => i !== subIndex);
    handleUpdateField(fieldIndex, cloneWithId(field, { fields: currentSubfields }));
  };

  const handleUpdateSubfield = (
    fieldIndex: number,
    subIndex: number,
    updatedSubfield: SectionTemplateField
  ) => {
    const field = fields[fieldIndex];
    const currentSubfields = [...(field.fields || [])];
    currentSubfields[subIndex] = updatedSubfield;
    handleUpdateField(fieldIndex, cloneWithId(field, { fields: currentSubfields }));
  };

  const handleSubfieldLabelChange = (
    fieldIndex: number,
    subIndex: number,
    newLabel: string
  ) => {
    const field = fields[fieldIndex];
    const subfield = (field.fields || [])[subIndex];
    const subId = getFieldId(subfield);
    const manual = isNameManuallyEdited(subfield, subId);
    const newName = manual ? subfield.name : slugify(newLabel);

    handleUpdateSubfield(
      fieldIndex,
      subIndex,
      cloneWithId(subfield, {
        label: newLabel,
        name: newName,
      })
    );
  };

  const handleSubfieldNameChange = (
    fieldIndex: number,
    subIndex: number,
    newName: string
  ) => {
    const field = fields[fieldIndex];
    const subfield = (field.fields || [])[subIndex];
    const subId = getFieldId(subfield);
    markManuallyEdited(subId);
    handleUpdateSubfield(fieldIndex, subIndex, cloneWithId(subfield, { name: newName }));
  };

  const handleSubfieldTypeChange = (
    fieldIndex: number,
    subIndex: number,
    newType: string
  ) => {
    const field = fields[fieldIndex];
    const subfield = (field.fields || [])[subIndex];
    const updated: Partial<SectionTemplateField> = { type: newType };

    if (newType === 'select') {
      updated.options = subfield.options || [];
    } else {
      delete (subfield as any).options;
    }

    handleUpdateSubfield(fieldIndex, subIndex, cloneWithId(subfield, updated));
  };

  const handleSubfieldRequiredChange = (
    fieldIndex: number,
    subIndex: number,
    checked: boolean
  ) => {
    const field = fields[fieldIndex];
    const subfield = (field.fields || [])[subIndex];
    handleUpdateSubfield(
      fieldIndex,
      subIndex,
      cloneWithId(subfield, { required: checked })
    );
  };

  const handleSubfieldOptionsChange = (
    fieldIndex: number,
    subIndex: number,
    options: string[]
  ) => {
    const field = fields[fieldIndex];
    const subfield = (field.fields || [])[subIndex];
    handleUpdateSubfield(
      fieldIndex,
      subIndex,
      cloneWithId(subfield, { options })
    );
  };

  return {
    getFieldId,
    handleAddField,
    handleRemoveField,
    handleUpdateField,
    handleLabelChange,
    handleNameChange,
    handleTypeChange,
    handleRequiredChange,
    handleOptionsChange,
    handleAddSubfield,
    handleRemoveSubfield,
    handleUpdateSubfield,
    handleSubfieldLabelChange,
    handleSubfieldNameChange,
    handleSubfieldTypeChange,
    handleSubfieldRequiredChange,
    handleSubfieldOptionsChange,
  };
}
