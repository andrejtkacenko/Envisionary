
export interface Note {
  id: string | number; // id может быть строкой или числом в зависимости от API
  title: string;
  content: string;
  tags: string[];
}