'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { autoMapFields } from '@/lib/batch/field-matcher';
import type { MergeField } from '@/types/template';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FieldMapperProps {
  csvHeaders: string[];
  templateFields: MergeField[];
  onConfirm: (mapping: Record<string, string>) => void;
}

export function FieldMapper({
  csvHeaders,
  templateFields,
  onConfirm,
}: FieldMapperProps) {
  // State: mapping of csvColumn -> templateFieldKey
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [autoMappings, setAutoMappings] = useState<
    Record<string, { field: string; confidence: number }>
  >({});

  // Auto-map on mount
  useEffect(() => {
    const templateFieldKeys = templateFields.map((f) => f.key);
    const mappings = autoMapFields(csvHeaders, templateFieldKeys);

    // Convert to lookup map and pre-select in state
    const autoMap: Record<string, { field: string; confidence: number }> = {};
    const initialMapping: Record<string, string> = {};

    for (const m of mappings) {
      autoMap[m.csvColumn] = {
        field: m.templateField,
        confidence: m.confidence,
      };
      initialMapping[m.csvColumn] = m.templateField;
    }

    setAutoMappings(autoMap);
    setMapping(initialMapping);
  }, [csvHeaders, templateFields]);

  const handleMappingChange = (csvColumn: string, templateField: string) => {
    if (templateField === '__unmapped__') {
      // Remove from mapping
      const newMapping = { ...mapping };
      delete newMapping[csvColumn];
      setMapping(newMapping);
    } else {
      setMapping((prev) => ({
        ...prev,
        [csvColumn]: templateField,
      }));
    }
  };

  // Check if any required fields are unmapped
  const requiredFields = templateFields.filter((f) => {
    // In the schema, all fields are optional, but we can check if there's a default value
    // For now, we'll just warn if high-confidence auto-matches were unmapped
    return false; // No strict required fields per plan
  });

  const hasMapping = Object.keys(mapping).length > 0;
  const unmappedRequiredFields = requiredFields.filter(
    (f) => !Object.values(mapping).includes(f.key)
  );

  return (
    <div className="space-y-6">
      {/* Warning for unmapped required fields */}
      {unmappedRequiredFields.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <AlertCircle className="size-5 flex-shrink-0 text-amber-500" />
          <div className="text-sm">
            <p className="font-medium text-amber-500">
              Required fields not mapped
            </p>
            <p className="mt-1 text-amber-500/80">
              {unmappedRequiredFields.map((f) => f.key).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Mapping table */}
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
          <span>CSV Column</span>
          <span></span>
          <span>Template Field</span>
        </div>

        <div className="space-y-2">
          {csvHeaders.map((header) => {
            const autoMap = autoMappings[header];
            const selectedField = mapping[header];

            return (
              <div
                key={header}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-lg border border-border/40 bg-white/[0.02] p-4"
              >
                {/* CSV column name */}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {header}
                  </p>
                </div>

                {/* Arrow icon */}
                <ArrowRight className="size-4 text-muted-foreground/50" />

                {/* Template field dropdown */}
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedField || '__unmapped__'}
                    onValueChange={(value) =>
                      handleMappingChange(header, value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unmapped__">
                        <span className="text-muted-foreground">Unmapped</span>
                      </SelectItem>
                      {templateFields.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          <div className="flex items-center gap-2">
                            <span>{field.key}</span>
                            <span className="text-xs text-muted-foreground">
                              ({field.fieldType})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Confidence badge if auto-matched */}
                  {autoMap && (
                    <div
                      className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        autoMap.confidence > 0.7
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {Math.round(autoMap.confidence * 100)}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm button */}
      <div className="flex justify-end">
        <Button
          onClick={() => onConfirm(mapping)}
          disabled={!hasMapping}
          size="lg"
        >
          Confirm Mapping
        </Button>
      </div>
    </div>
  );
}
