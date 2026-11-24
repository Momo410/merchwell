// eve compiles non-code imports to data URLs.
declare module "*.ttf" {
  const dataUrl: string;
  export default dataUrl;
}
