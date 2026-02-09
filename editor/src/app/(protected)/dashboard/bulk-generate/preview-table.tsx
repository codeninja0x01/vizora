'use client';

import { useState, useEffect } from 'react';
import { Check, X, AlertCircle, Loader2 } from 'lucide-react';
import Ajv from 'ajv';
import type { MergeField } from '@/types/template';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const ajv = new Ajv();

interface ValidationResult {
  rowIndex: number;
  valid: boolean;
  errors: string[];
  mappedData: Record<string, unknown>;
}

interface PreviewTableProps {
  rows: Record<string, unknown>[];
  mapping: Record<string, string>; // csvColumn -> templateFieldKey
  mergeFields: MergeField[];
  onSubmit: (validRows: Record<string, unknown>[]) => void;
  isSubmitting: boolean;
}

export function PreviewTable({
  rows,
  mapping,
  mergeFields,
  onSubmit,
  isSubmitting,
}: PreviewTableProps) {
  const [validationResults, setValidationResults] = useState<
    ValidationResult[]
  >([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Validate all rows on mount or when data changes
  useEffect(() => {
    const results: ValidationResult[] = [];
    const initialSelected = new Set<number>();

    // Build merge schema from merge fields for validation
    const mergeSchema = {
      type: 'object',
      properties: {} as Record<string, unknown>,
      additionalProperties: true,
    };

    for (const field of mergeFields) {
      mergeSchema.properties[field.key] = {
        type: field.fieldType === 'number' ? 'number' : 'string',
      };
    }

    const validate = ajv.compile(mergeSchema);

    for (let i = 0; i < rows.length; i++) {
      const csvRow = rows[i];

      // Apply mapping to transform CSV row to merge data
      const mappedData: Record<string, unknown> = {};
      for (const [csvColumn, templateFieldKey] of Object.entries(mapping)) {
        mappedData[templateFieldKey] = csvRow[csvColumn];
      }

      // Validate mapped data
      const valid = validate(mappedData);
      const errors: string[] = [];

      if (!valid && validate.errors) {
        for (const err of validate.errors) {
          errors.push(err.message || 'Validation error');
        }
      }

      results.push({
        rowIndex: i,
        valid,
        errors,
        mappedData,
      });

      // Auto-select valid rows
      if (valid) {
        initialSelected.add(i);
      }
    }

    setValidationResults(results);
    setSelectedRows(initialSelected);
  }, [rows, mapping, mergeFields]);

  const handleRowToggle = (rowIndex: number, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(rowIndex);
    } else {
      newSelected.delete(rowIndex);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all valid rows
      const validIndexes = validationResults
        .filter((r) => r.valid)
        .map((r) => r.rowIndex);
      setSelectedRows(new Set(validIndexes));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSubmit = () => {
    // Filter to selected valid rows and extract mapped data
    const selectedValidRows = validationResults
      .filter((r) => selectedRows.has(r.rowIndex) && r.valid)
      .map((r) => r.mappedData);

    onSubmit(selectedValidRows);
  };

  const validCount = validationResults.filter((r) => r.valid).length;
  const selectedValidCount = validationResults.filter(
    (r) => r.valid && selectedRows.has(r.rowIndex)
  ).length;

  // Get mapped field keys for table headers
  const mappedFieldKeys = Array.from(new Set(Object.values(mapping)));

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-lg border border-border/40 bg-white/[0.02] p-4">
        <div className="flex items-center gap-2">
          {validCount === rows.length ? (
            <Check className="size-5 text-green-500" />
          ) : (
            <AlertCircle className="size-5 text-amber-500" />
          )}
          <span className="text-sm font-medium text-foreground">
            {validCount} of {rows.length} rows valid
          </span>
        </div>

        <div className="text-sm text-muted-foreground">
          {selectedValidCount} selected for submission
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border/40">
        <table className="w-full text-sm">
          <thead className="border-b border-border/40 bg-white/[0.02]">
            <tr>
              <th className="p-3 text-left">
                <Checkbox
                  checked={
                    selectedValidCount > 0 && selectedValidCount === validCount
                  }
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th className="p-3 text-left font-medium text-muted-foreground">
                Row
              </th>
              <th className="p-3 text-left font-medium text-muted-foreground">
                Status
              </th>
              {mappedFieldKeys.map((fieldKey) => (
                <th
                  key={fieldKey}
                  className="p-3 text-left font-medium text-muted-foreground"
                >
                  {fieldKey}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {validationResults.map((result) => {
              const isSelected = selectedRows.has(result.rowIndex);

              return (
                <tr
                  key={result.rowIndex}
                  className={`border-b border-border/40 ${
                    !result.valid ? 'bg-red-500/5' : ''
                  }`}
                >
                  <td className="p-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleRowToggle(result.rowIndex, checked === true)
                      }
                      disabled={!result.valid}
                    />
                  </td>
                  <td className="p-3 text-foreground">{result.rowIndex + 1}</td>
                  <td className="p-3">
                    {result.valid ? (
                      <div className="flex items-center gap-1.5 text-green-500">
                        <Check className="size-4" />
                        <span className="text-xs font-medium">Valid</span>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-1.5 text-red-500"
                        title={result.errors.join(', ')}
                      >
                        <X className="size-4" />
                        <span className="text-xs font-medium">Invalid</span>
                      </div>
                    )}
                  </td>
                  {mappedFieldKeys.map((fieldKey) => (
                    <td key={fieldKey} className="p-3 text-muted-foreground">
                      <span className="truncate max-w-[200px] inline-block">
                        {String(result.mappedData[fieldKey] ?? '')}
                      </span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Submit button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={selectedValidCount === 0 || isSubmitting}
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Submitting...
            </>
          ) : (
            `Submit ${selectedValidCount} ${selectedValidCount === 1 ? 'render' : 'renders'}`
          )}
        </Button>
      </div>
    </div>
  );
}
