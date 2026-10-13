import React from 'react';
import {
  Box,
  Flex,
  Card,
  Text,
  TextField,
  Select,
  Switch,
  IconButton,
} from '@radix-ui/themes';
import { TrashIcon } from '@radix-ui/react-icons';
import { SUBFIELD_TYPES } from '../../constants';
import { SubfieldCardProps } from '../../types';
import { SelectOptionsEditor } from '../SelectOptionsEditor';

export const SubfieldCard: React.FC<SubfieldCardProps> = ({
  fieldIndex,
  subIndex,
  subfield,
  subId,
  disabled = false,
  onSubfieldLabelChange,
  onSubfieldNameChange,
  onSubfieldTypeChange,
  onSubfieldRequiredChange,
  onSubfieldOptionsChange,
  onRemoveSubfield,
}) => {
  const isSubSelect = subfield.type === 'select';

  return (
    <Card
      key={subId}
      size="1"
      style={{
        backgroundColor: 'var(--gray-2)',
        border: '1px solid var(--gray-4)',
      }}
    >
      <Flex direction="row" gap="2" align="end" wrap="wrap">
        <Box style={{ flex: '1 1 150px' }}>
          <Text
            as="label"
            htmlFor={`sub-label-${fieldIndex}-${subIndex}`}
            size="1"
            weight="medium"
            color="gray"
            mb="1"
            style={{ display: 'block' }}
          >
            Sub-field Label
          </Text>
          <TextField.Root
            id={`sub-label-${fieldIndex}-${subIndex}`}
            size="1"
            value={subfield.label}
            onChange={(e) =>
              onSubfieldLabelChange(fieldIndex, subIndex, e.target.value)
            }
            placeholder="Sub-field Label"
            aria-label="Sub-field Label"
            disabled={disabled}
          />
        </Box>
        <Box style={{ flex: '1 1 150px' }}>
          <Text
            as="label"
            htmlFor={`sub-name-${fieldIndex}-${subIndex}`}
            size="1"
            weight="medium"
            color="gray"
            mb="1"
            style={{ display: 'block' }}
          >
            Sub-field Name
          </Text>
          <TextField.Root
            id={`sub-name-${fieldIndex}-${subIndex}`}
            size="1"
            value={subfield.name}
            onChange={(e) =>
              onSubfieldNameChange(fieldIndex, subIndex, e.target.value)
            }
            placeholder="Sub-field Name"
            aria-label="Sub-field Name"
            disabled={disabled}
          />
        </Box>
        <Box style={{ width: '130px' }}>
          <Text
            as="label"
            size="1"
            weight="medium"
            color="gray"
            mb="1"
            style={{ display: 'block' }}
          >
            Type
          </Text>
          <Select.Root
            value={subfield.type || 'text'}
            onValueChange={(val) =>
              onSubfieldTypeChange(fieldIndex, subIndex, val)
            }
            disabled={disabled}
          >
            <Select.Trigger
              aria-label="Sub-field Type"
              style={{ width: '100%' }}
            />
            <Select.Content>
              {SUBFIELD_TYPES.map((t) => (
                <Select.Item key={t.value} value={t.value}>
                  {t.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Box>
        <Flex align="center" gap="1" pb="1">
          <Switch
            id={`sub-req-${fieldIndex}-${subIndex}`}
            size="1"
            checked={Boolean(subfield.required)}
            onCheckedChange={(checked) =>
              onSubfieldRequiredChange(fieldIndex, subIndex, checked)
            }
            disabled={disabled}
            aria-label="Sub-field Required"
          />
          <Text
            as="label"
            htmlFor={`sub-req-${fieldIndex}-${subIndex}`}
            size="1"
          >
            Req
          </Text>
        </Flex>
        <IconButton
          type="button"
          size="1"
          color="red"
          variant="ghost"
          onClick={() => onRemoveSubfield(fieldIndex, subIndex)}
          disabled={disabled}
          aria-label="Remove sub-field"
          title="Remove sub-field"
        >
          <TrashIcon width="14" height="14" />
        </IconButton>
      </Flex>

      {/* Subfield Select Options */}
      {isSubSelect && (
        <SelectOptionsEditor
          options={subfield.options}
          onChange={(opts) =>
            onSubfieldOptionsChange(fieldIndex, subIndex, opts)
          }
          disabled={disabled}
        />
      )}
    </Card>
  );
};

export default SubfieldCard;
