export const useListFieldActions = (
  items: Record<string, any>[] | undefined,
  onChange: (items: Record<string, any>[]) => void
) => {
  const safeItems = Array.isArray(items) ? items : [];

  const handleAddItem = () => {
    const newItem: Record<string, any> = {};
    onChange([...safeItems, newItem]);
  };

  const handleRemove = (index: number) => {
    onChange(safeItems.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...safeItems];
    const temp = newItems[index - 1];
    newItems[index - 1] = newItems[index];
    newItems[index] = temp;
    onChange(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index >= safeItems.length - 1) return;
    const newItems = [...safeItems];
    const temp = newItems[index + 1];
    newItems[index + 1] = newItems[index];
    newItems[index] = temp;
    onChange(newItems);
  };

  const handleItemChange = (index: number, updatedData: Record<string, any>) => {
    const newItems = [...safeItems];
    newItems[index] = updatedData;
    onChange(newItems);
  };

  return {
    safeItems,
    handleAddItem,
    handleRemove,
    handleMoveUp,
    handleMoveDown,
    handleItemChange,
  };
};

export default useListFieldActions;
