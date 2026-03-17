const Order = require("../models/Order");

exports.getSalesReport = async (req,res)=>{

try{

const {startDate,endDate} = req.query;

if(!startDate || !endDate){
return res.status(400).json({
message:"Start date and end date required"
});
}

const orders = await Order.find({
createdAt:{
$gte:new Date(startDate),
$lte:new Date(endDate)
}
}).populate("user");

const totalRevenue = orders.reduce(
(sum,o)=>sum + o.totalAmount,
0
);

const uniqueCustomers =
new Set(orders.map(o=>o.user._id.toString())).size;

res.json({
totalOrders:orders.length,
totalRevenue,
totalCustomers:uniqueCustomers
});

}catch(err){

console.error("REPORT ERROR:",err);

res.status(500).json({
message:"Failed to generate report"
});

}

};
