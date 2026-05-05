"use client";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "20px",
      }}
    >
      <SignUp
        appearance={{
          variables: {
            colorPrimary: "#C4872A",
            colorBackground: "#FAF8F5",
            colorText: "#16120e",
            borderRadius: "12px",
          },
          elements: {
            card: { boxShadow: "0 4px 32px rgba(0,0,0,0.08)", border: "1px solid var(--border)" },
            headerTitle: { fontSize: "20px", fontWeight: "700" },
          },
        }}
      />
    </div>
  );
}
