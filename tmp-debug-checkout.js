process.env.MONGODB_URL = process.env.MONGODB_URL || "mongodb+srv://gamil:Mbg4624640@milosbg.hyhwfdr.mongodb.net/?retryWrites=true&w=majority&appName=MilosBG";
require("ts-node/register/transpile-only");
const { startStorefrontCheckout } = require("./lib/storefrontCheckout");

(async () => {
  const body = {
    cartItems: [
      { productId: "68d56c109e60fdb7d2617ada", title: "Milos BG", price: 1, quantity: 1, size: "L", color: "Black" },
      { productId: "68d56c109e60fdb7d2617ada", title: "Milos BG", price: 1, quantity: 1, size: "L", color: "Black" },
      { productId: "68d56c109e60fdb7d2617ada", title: "Milos BG", price: 1, quantity: 1, size: "L", color: "Black" }
    ],
    customer: {
      clerkId: "user_debug",
      email: "debug@example.com",
      name: "Debug User"
    },
    contact: {
      email: "debug@example.com"
    },
    shippingAddress: {
      firstName: "Debug",
      lastName: "User",
      address: "1 Debug St",
      city: "Paris",
      postalCode: "75000",
      country: "France"
    },
    shippingOption: "FREE"
  };

  const result = await startStorefrontCheckout(body);
  console.log(result);
})();
