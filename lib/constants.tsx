import { MdDns, MdDehaze, MdStorefront } from "react-icons/md";

export const navLinks = [
  {
    url: "/",
    icon: <MdDns className="mbg-icon" />,
    label: "Dashboard",
  },
  {
    url: "/chapters",
    icon: <MdDehaze className="mbg-icon" />,
    label: "Chapters",
  },
  {
    url: "/products",
    icon: <MdDehaze className="mbg-icon" />,
    label: "Products",
  },
  {
    url: "/orders",
    icon: <MdDehaze className="mbg-icon" />,
    label: "Orders",
  },
  {
    url: "/customers",
    icon: <MdDehaze className="mbg-icon" />,
    label: "Customers",
  },
  {
    url: "/milos-bg",
    icon: <MdStorefront className="mbg-icon" />,
    label: "Milos BG",
  },
];
