import Container from "@/components/mbg-components/Container";
import ProductForm from "@/components/products/ProductForm";
import React from "react";

export const dynamic = "force-dynamic";




const CreateProduct = () => {
  return (
    <Container>
      <ProductForm />
    </Container>
  );
};

export default CreateProduct;
