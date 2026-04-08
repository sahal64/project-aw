const Order = require("../models/Order");

exports.getSalesReport = async (req,res)=>{

try{

const {startDate,endDate} = req.query;

if(!startDate || !endDate){
return res.status(400).json({
message:"Start date and end date required"
});
}

const start = new Date(startDate);
start.setHours(0, 0, 0, 0);

const end = new Date(endDate);
end.setHours(23, 59, 59, 999);

const orders = await Order.find({
createdAt:{
$gte:start,
$lte:end
}
}).populate("user");

const totalRevenue = orders.reduce(
(sum,o)=>sum + o.totalAmount,
0
);

const uniqueCustomers =
new Set(orders.map(o=>o.user ? o.user._id.toString() : o.user)).size;

res.json({
totalOrders:orders.length,
totalRevenue,
totalCustomers:uniqueCustomers,
orders: orders
});

}catch(err){

console.error("REPORT ERROR:",err);

res.status(500).json({
message:"Failed to generate report"
});

}

};
