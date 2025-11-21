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
  paymentStatus?: "PENDING" | "PAID" | "NOT PAID";
  fulfillmentStatus: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "COMPLETED" | "CANCELLED";
  shippingMethod?: "FREE" | "EXPRESS" | null;
  trackingNumber?: string | null;
  transporter?: string | null;
  dateMailed?: string | null;
  shippingRate?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactName?: string | null;
  notes?: string | null;
  shippingAddress?: {
    firstName?: string | null;
    lastName?: string | null;
    street?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    phone?: string | null;
  } | null;
  createdAt: string;
}
type OrderItemType = {
  product: ProductType;
  productId?: string;
  titleSnapshot?: string;
  color: string;
  size: string;
  quantity: number;
}
type CustomerType = {
  clerkId: string;
  name: string;
  email: string;
}
