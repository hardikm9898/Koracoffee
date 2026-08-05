import AdminCard from "@/components/admin/AdminCard";
import AdminTopbar from "@/components/admin/AdminTopbar";
import ProductForm from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <AdminTopbar
        title="Add new product"
        description="Create a new storefront-ready product with the same catalog fields used by the public product API."
        badge="Catalog"
      />
      <AdminCard>
        <ProductForm mode="create" />
      </AdminCard>
    </div>
  );
}
