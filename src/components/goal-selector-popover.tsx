
"use client";

import { useState } from 'react';
import { ChevronsUpDown, Plus, Search } from 'lucide-react';
import type { Goal } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ScrollArea } from './ui/scroll-area';

interface GoalSelectorPopoverProps {
  goals: Goal[];
  onGoalSelect: (goal: Goal) => void;
}

export function GoalSelectorPopover({ goals, onGoalSelect }: GoalSelectorPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className="w-[150px] justify-between"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Goal
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search goals..." />
          <CommandList>
            <ScrollArea className="h-64">
              <CommandEmpty>No goals found.</CommandEmpty>
              <CommandGroup>
                {goals.map((goal) => (
                  <CommandItem
                    key={goal.id}
                    value={goal.title}
                    onSelect={() => {
                      onGoalSelect(goal);
                      setOpen(false);
                    }}
                  >
                    {goal.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
