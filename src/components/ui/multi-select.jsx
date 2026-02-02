"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MultiSelect = React.forwardRef(
  ({ options = [], value = [], onValueChange, placeholder = "Select..." }, ref) => {
    const [open, setOpen] = React.useState(false);

    // Handle both string arrays and object arrays
    const getOptionValue = (option) => {
      return typeof option === 'string' ? option : option.value;
    };

    const getOptionLabel = (option) => {
      return typeof option === 'string' ? option : option.label;
    };

    const handleSelect = (optionValue) => {
      const newValue = value.includes(optionValue)
        ? value.filter((item) => item !== optionValue)
        : [...value, optionValue];
      onValueChange(newValue);
    };

    const handleRemove = (e, optionValue) => {
      e.preventDefault();
      e.stopPropagation();
      onValueChange(value.filter((item) => item !== optionValue));
    };

    const getDisplayLabel = (val) => {
      const option = options.find(opt => getOptionValue(opt) === val);
      return option ? getOptionLabel(option) : val;
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between min-h-10 h-auto"
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {value.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                value.map((item) => (
                  <Badge 
                    key={item} 
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <span className="max-w-[150px] truncate">
                      {getDisplayLabel(item)}
                    </span>
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={(e) => handleRemove(e, item)}
                    />
                  </Badge>
                ))
              )}
            </div>
            <div className="opacity-50 ml-2">↓</div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search...`} />
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {options.map((option) => {
                const optionValue = getOptionValue(option);
                const optionLabel = getOptionLabel(option);
                const isSelected = value.includes(optionValue);
                
                return (
                  <CommandItem
                    key={optionValue}
                    value={optionLabel}
                    onSelect={() => handleSelect(optionValue)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className={cn(
                        "h-4 w-4 border rounded flex items-center justify-center",
                        isSelected && "bg-primary border-primary"
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span className="truncate">{optionLabel}</span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

MultiSelect.displayName = "MultiSelect";

export { MultiSelect };
