const requiredEnvs = [
  {
    key: "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
    description:
      "Learn how to create a publishable key: https://docs.medusajs.com/v2/resources/storefront-development/publishable-api-keys",
  },
];

// NOTE: kept dependency-free (no ansi-colors) so this file can load at
// runtime after devDependencies are pruned on Heroku.
function checkEnvVariables() {
  const missingEnvs = requiredEnvs.filter(function (env) {
    return !process.env[env.key];
  });

  if (missingEnvs.length > 0) {
    console.error("\n[storefront] Missing required environment variables\n");

    missingEnvs.forEach(function (env) {
      console.error("  " + env.key);
      if (env.description) {
        console.error("    " + env.description + "\n");
      }
    });

    console.error(
      "\nPlease set these variables in your .env file or environment before starting the application.\n"
    );

    process.exit(1);
  }
}

module.exports = checkEnvVariables;
