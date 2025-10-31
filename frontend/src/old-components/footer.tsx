// Footer component spans full width (12 grid columns) and fixed height of 60px
// Uses TailwindCSS for styling and Lucide icons for social links

const FooterComponent: React.FC = () => {
  // Log to confirm palette applied
  React.useEffect(() => {
    console.log("Footer palette applied: primary-blue & basic-white");
  }, []);
  return (
    <div
      className="w-full flex items-center justify-center py-2 px-4"
      style={{
        // Repeating palette variables for consistency
        backgroundColor: "var(--primary-blue)",
        color: "var(--basic-white)",
      }}
    >
      {/* Inner wrapper keeps text and icons centered & stacked */}
      <div className="w-full flex flex-col items-center justify-center">
        {/* Copyright */}
        <div
            className="font-custom text-[10px] m-0"
            style={{ color: "var(--basic-white)", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
          >
            © 2024 ShipShares. All rights reserved.
          </div>
      </div>
    </div>
  );
};

export { FooterComponent as component };