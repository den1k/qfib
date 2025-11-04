import { FormSchema } from './formSchema';

export interface ControlSet {
  id: string;
  name: string;
  schemas: FormSchema[];
}

