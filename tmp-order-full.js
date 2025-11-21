const mongoose = require("mongoose");
(async () => {
  await mongoose.connect("mongodb+srv://gamil:Mbg4624640@milosbg.hyhwfdr.mongodb.net/?retryWrites=true&w=majority&appName=MilosBG", { dbName: "Mbg_Admin" });
  const orders = mongoose.connection.collection("orders");
  const order = await orders.findOne({}, { sort: { createdAt: -1 } });
  console.log(JSON.stringify(order, null, 2));
  await mongoose.disconnect();
})();
