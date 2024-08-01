declare type Images = {
  large?: string;
  common?: string;
}

declare type Rating = {
  rank: number;
  total: number;
  score: number;
  count: { [key: string]: number };
}

declare type Tag = {
  name: string;
  count: number;
}

export declare type DataItem = {
  id: number;
  name: string;
  name_cn: string;
  summary: string;
  date: string | null;
  platform: string;
  images: Images;
  eps: number;
  rating: Rating;
  tags: Tag[];
  locked: boolean;
}

declare type Data = DataItem[];
export default Data;
