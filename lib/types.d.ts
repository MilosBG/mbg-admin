type ChapterType = {
  _id: string;
  title: string;
  description: string;
  image: string;
  products: ProductType[];
};
type ProductType = {
  _id: string;
  title: string;
  description: string;
  media: string[];
  category: string;
  chapters: ChapterType[];
  tags: string[];
  sizes: string[];
  colors: string[];
  variants?: { color?: string; size?: string; stock: number }[];
  countInStock: number;
  price: number;
  expense: number;
  fetchToStore?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type OrderColumnType = {
  _id: string;
  customer: string;
  products: number;
  totalAmount: number;
  fulfillmentStatus: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "COMPLETED" | "CANCELLED";
  shippingMethod?: "FREE" | "EXPRESS" | null;
  trackingNumber?: string | null;
  weightGrams?: number | null;
  dateMailed?: string | null;
  shippingRate?: string | null;
  createdAt: string;
}
type OrderItemType = {
  product: ProductType;
  color: string;
  size: string;
  quantity: number;
}
type CustomerType = {
  clerkId: string;
  name: string;
  email: string;
}
