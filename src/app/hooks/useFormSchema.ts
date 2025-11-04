import { useState, useEffect, useCallback, useRef } from 'react';
import { FormSchema } from '../../types/formSchema';

const STORAGE_KEY = 'esp32-form-schemas';
const ACTIVE_SCHEMA_KEY = 'esp32-active-schema';

interface UseFormSchemaOptions {
  projectSchemas?: FormSchema[];
  onSchemasChange?: (schemas: FormSchema[]) => void | Promise<void>;
  projectId?: string;
}

export function useFormSchema(options?: UseFormSchemaOptions) {
  const [schemas, setSchemas] = useState<FormSchema[]>([]);
  const [activeSchemaId, setActiveSchemaId] = useState<string>('');
  const isInitializingRef = useRef(false);
  const lastProjectSchemasRef = useRef<string>('');

  // Load schemas from project or localStorage on mount
  useEffect(() => {
    if (options?.projectSchemas) {
      // Use project schemas
      const projectSchemasStr = JSON.stringify(options.projectSchemas);
      
      // Only update if project schemas actually changed (prevents infinite loop)
      if (projectSchemasStr !== lastProjectSchemasRef.current) {
        isInitializingRef.current = true;
        lastProjectSchemasRef.current = projectSchemasStr;
        setSchemas(options.projectSchemas);
        if (options.projectSchemas.length > 0) {
          setActiveSchemaId(options.projectSchemas[0].id);
        }
        // Reset flag after a tick
        setTimeout(() => {
          isInitializingRef.current = false;
        }, 0);
      }
    } else {
      // Fallback to localStorage for backward compatibility
      const savedSchemas = localStorage.getItem(STORAGE_KEY);
      const savedActiveId = localStorage.getItem(ACTIVE_SCHEMA_KEY);
      
      if (savedSchemas) {
        try {
          const parsedSchemas = JSON.parse(savedSchemas);
          setSchemas(parsedSchemas);
          
          if (savedActiveId && parsedSchemas.find((s: FormSchema) => s.id === savedActiveId)) {
            setActiveSchemaId(savedActiveId);
          } else if (parsedSchemas.length > 0) {
            setActiveSchemaId(parsedSchemas[0].id);
          }
        } catch (error) {
          console.error('Failed to parse saved schemas:', error);
        }
      }
    }
  }, [options?.projectSchemas]);

  // Save schemas to localStorage when they change (only for non-project mode)
  useEffect(() => {
    // Don't save if we're initializing from project or if we're in project mode
    if (isInitializingRef.current || options?.projectId) {
      return;
    }
    
    if (schemas.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schemas));
    }
  }, [schemas, options?.projectId]);

  // Save active schema ID to localStorage whenever it changes
  useEffect(() => {
    if (activeSchemaId) {
      localStorage.setItem(ACTIVE_SCHEMA_KEY, activeSchemaId);
    }
  }, [activeSchemaId]);

  const saveSchema = useCallback(async (schema: FormSchema) => {
    const updatedSchemas = (() => {
      const existingIndex = schemas.findIndex(s => s.id === schema.id);
      if (existingIndex >= 0) {
        const updated = [...schemas];
        updated[existingIndex] = schema;
        return updated;
      } else {
        return [...schemas, schema];
      }
    })();

    setSchemas(updatedSchemas);

    // If callback is provided, call it to save to project (but only if not initializing)
    if (options?.onSchemasChange && !isInitializingRef.current) {
      await options.onSchemasChange(updatedSchemas);
    }
  }, [schemas, options?.onSchemasChange]);

  const deleteSchema = useCallback(async (id: string) => {
    const updatedSchemas = schemas.filter(s => s.id !== id);
    setSchemas(updatedSchemas);
    
    // If we deleted the active schema, switch to another one
    if (activeSchemaId === id) {
      if (updatedSchemas.length > 0) {
        setActiveSchemaId(updatedSchemas[0].id);
      } else {
        setActiveSchemaId('');
      }
    }

    // If callback is provided, call it to save to project (but only if not initializing)
    if (options?.onSchemasChange && !isInitializingRef.current) {
      await options.onSchemasChange(updatedSchemas);
    }
  }, [schemas, activeSchemaId, options?.onSchemasChange]);

  const getActiveSchema = (): FormSchema | null => {
    return schemas.find(s => s.id === activeSchemaId) || null;
  };

  const setActiveSchema = (id: string) => {
    if (schemas.find(s => s.id === id)) {
      setActiveSchemaId(id);
    }
  };

  return {
    schemas,
    activeSchemaId,
    activeSchema: getActiveSchema(),
    saveSchema,
    deleteSchema,
    setActiveSchema,
    getActiveSchema
  };
}
