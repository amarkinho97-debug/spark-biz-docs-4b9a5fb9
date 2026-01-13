export const scrollToSection = (
  id: string,
  options?: { highlight?: boolean }
) => {
  if (typeof document === "undefined") return;

  const element = document.getElementById(id);
  if (!element) return;

  const navOffset = 72; // compensar altura aproximada da navbar fixa
  const rect = element.getBoundingClientRect();
  const offsetTop = rect.top + window.scrollY - navOffset;

  window.scrollTo({ top: offsetTop, behavior: "smooth" });

  if (options?.highlight) {
    element.classList.add("pricing-highlight");
    window.setTimeout(() => {
      element.classList.remove("pricing-highlight");
    }, 1200);
  }
};
