import { FormSchema } from './formSchema';

export interface ControlSet {
  id: string;
  name?: string; // Deprecated: use schema.title instead. Kept for backward compatibility.
  schemas: FormSchema[];
}

