import ComingSoon from '@/components/ComingSoon'

export default function InvoicePage() {
  return (
    <ComingSoon
      icon="🧾"
      label="Invoice Generator"
      description="Create professional PDF invoices"
      color="#1ABC9C"
      features={[
        'Your name/company, client details, invoice number & dates',
        'Line items with description, quantity & unit price',
        'Auto-calculate subtotal, tax (%), and total',
        'Currency selector',
        'Clean professional PDF output via pdf-lib',
        'Remembers your details in localStorage',
      ]}
    />
  )
}
