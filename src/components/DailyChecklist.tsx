import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface DailyChecklistProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  placeholder?: string;
  readOnly?: boolean;
  compact?: boolean;
}

export function DailyChecklist({ items, onChange, placeholder = "Add an item...", readOnly = false, compact = false }: DailyChecklistProps) {
  const [newItemText, setNewItemText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const addItem = () => {
    if (!newItemText.trim()) return;
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: newItemText.trim(),
      completed: false
    };
    onChange([...items, newItem]);
    setNewItemText('');
  };

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const toggleItem = (id: string) => {
    onChange(items.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const startEditing = (item: ChecklistItem) => {
    if (readOnly) return;
    setEditingId(item.id);
    setEditingText(item.text);
  };

  const saveEdit = () => {
    if (!editingId) return;
    onChange(items.map(item => 
      item.id === editingId ? { ...item, text: editingText.trim() } : item
    ));
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addItem();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {items.map((item) => (
          <div 
            key={item.id} 
            className={cn(
              "group flex items-center gap-3 rounded-lg border border-border/40 bg-background/40 transition-all",
              compact ? "p-1.5" : "p-2",
              item.completed && "opacity-60 bg-muted/20"
            )}
          >
            <button
              onClick={() => !readOnly && toggleItem(item.id)}
              disabled={readOnly}
              className={cn(
                "h-5 w-5 rounded border-2 flex items-center justify-center transition-colors",
                item.completed 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : "border-muted-foreground/30 hover:border-primary/50"
              )}
            >
              {item.completed && <Check className="h-3 w-3 stroke-[4]" />}
            </button>
            
            {editingId === item.id ? (
              <Input
                autoFocus
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={handleEditKeyDown}
                className="flex-1 h-7 text-sm py-0 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              />
            ) : (
              <span 
                onClick={() => startEditing(item)}
                className={cn(
                  "flex-1 text-sm font-medium leading-none cursor-text",
                  item.completed && "line-through text-muted-foreground",
                  !readOnly && "hover:text-primary transition-colors"
                )}
              >
                {item.text}
              </span>
            )}

            {!readOnly && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeItem(item.id)}
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="flex gap-2">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-9 bg-background/20 border-dashed"
          />
          <Button size="sm" onClick={addItem} className="h-9 px-3">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {items.length === 0 && readOnly && (
        <p className="text-sm text-muted-foreground italic text-center py-4">
          No items recorded.
        </p>
      )}
    </div>
  );
}
