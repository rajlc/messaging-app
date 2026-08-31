NCM API DOCUMENTATION
NCM API COLLECTION
What is NCM API?
NCM API service gives you the capability to integrate your online system with NCM's portal. Our API service
currently provides you the capability to
[ ✔️ ] Fetch Particular Order Details
[ ✔️ ] Fetch Order Comments
[ ✔️ ] Fetch last 25 comments of orders
[ ✔️ ] Fetch Order Status
[ ✔️ ] Create a new Order right from your own system
API Limits
Order Creation : 1,000 per day
Order View (Detail, Comments, Status ): 20,000 per day
Every vendor is provided with an API Token Key. Use this api token key to make an api request
into the server.
If you forgot the token or want to request new token, contact our IT Admin.
GET Branch Lists with details
This endpoint allows to fetch the list of all branches of NCM with their details like phone number,
covered areas, district, regions etc.
Link: https://demo.nepalcanmove.com/api/v2/branches
GET Delivery Charges between branches
This endpoint allows to calculate the delivery charge for the branches.
Link: https://demo.nepalcanmove.com/api/v1/shipping-rate?
creation=TINKUNE&destination=POKHARA&type=Pickup/Collect
Params:
creation : pickup branch
README.md 2026-05-27
1 / 32
destination : destination branch to where order needs to be send
type : delivery type
Available Delivery Types for 'type' parameter:
Type Value Description
Charge
Calculation
Pickup/Collect Door2Door (NCM pickup & delivery) Full base charge
Send Branch2Door (Sender drops at branch, NCM delivers at door) Full base charge
D2B Door2Branch (NCM pick, Customer collect at branch) Base charge - 50
B2B
Branch2Branch (Sender Drop at branch & customer collect at
branch)
Base charge - 50
Headers
Authorization Token <your token keys>
GET Order Details
This endpoint allows to fetch the details of a particular order in your system. These details are the same
as the details you see on the NCM portal when you view a particular order.
Link: https://demo.nepalcanmove.com/api/v1/order?id=ORDERID
Headers
Authorization Token <your token keys>
Params
id ORDERID your order id in ncm system
Example:
curl --location --request GET https://demo.nepalcanmove.com/api/v1/order?id=134 \
README.md 2026-05-27
2 / 32
--header "Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45" \
Result:
Response Status 200
{
 "orderid": 134,
 "cod_charge": "1710.00",
 "delivery_charge": "99.00",
 "last_delivery_status": "Delivered",
 "payment_status": "Completed"
}
GET Order Comments
This endpoint allows to fetch the comments of a particular order in your system. The api will provide
all the comments done in a particular order. Comments will be in descending order of created date.
Link: https://demo.nepalcanmove.com/api/v1/order/comment?id=ORDERID
Headers
Authorization Token <your access token keys>
Params
id ORDERID your order id in ncm system
Example:
curl --location --request GET https://demo.nepalcanmove.com/api/v1/order/comment?
id=134 \
--header "Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45" \
Result:
Response Status 200
[
README.md 2026-05-27
3 / 32
 {
 "orderid": 134,
 "comments": "Please provide us with the correct phone number?",
 "addedBy": "NCM Staff",
 "added_time": "2019-11-02T16:43:15.687200+05:45"
 },
 {
 "orderid": 134,
 "comments": "Test comments",
 "addedBy": "Vendor",
 "added_time": "2019-10-15T12:22:15.989560+05:45"
 },
 {
 "orderid": 134,
 "comments": "Test Comment",
 "addedBy": "NCM Staff",
 "added_time": "2019-10-15T11:33:16.472031+05:45"
 }
]
GET LAST 25 Order Comments
This endpoint allows to fetch the last 25 comments done to your orders. Latest comments will be
fetched at the top.
Link: https://demo.nepalcanmove.com/api/v1/order/getbulkcomments
Headers
Authorization Token <your access token keys>
Example:
curl --location --request GET
https://demo.nepalcanmove.com/api/v1/order/getbulkcomments \
--header "Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45"
Result:
Response Status 200
[
 {
README.md 2026-05-27
4 / 32
 "orderid": 123,
 "comments": "Test Comments",
 "addedBy": "NCM Staff",
 "added_time": "2020-01-28T18:20:29.349013+05:45"
 },
 {
 "orderid": 123,
 "comments": "Phone Not Received Multiple Times",
 "addedBy": "NCM Staff",
 "added_time": "2020-01-29T11:04:51.510397+05:45"
 },
 {
 "orderid": 123,
 "comments": "Phone Not Received Multiple Times",
 "addedBy": "NCM Staff",
 "added_time": "2020-01-28T16:02:54.335899+05:45"
 },
 {
 "orderid": 123,
 "comments": "Area not covered by NCM",
 "addedBy": "NCM Staff",
 "added_time": "2020-01-28T15:59:55.371198+05:45"
 }
 ...
]
GET Order Status
This endpoint allows to fetch the status of a particular order in your system. The api will provide all the
status of a particular order. Statuses will be in descending order of created date.
Link: https://demo.nepalcanmove.com/api/v1/order/status?id=ORDERID
Headers
Authorization Token <your access token keys>
Params
id ORDERID your order id in ncm system
Example:
README.md 2026-05-27
5 / 32
curl --location --request GET https://demo.nepalcanmove.com/api/v1/order/status?
id=134 \
--header "Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45"
Result:
Response Status 200
[
 {
 "orderid": 134,
 "status": "Delivered",
 "added_time": "2019-10-18T13:24:30.960365+05:45"
 },
 {
 "orderid": 134,
 "status": "Sent for Delivery",
 "added_time": "2019-10-18T13:22:21.033595+05:45"
 },
 {
 "orderid": 134,
 "status": "Pickup Complete",
 "added_time": "2019-10-18T13:17:25.326792+05:45"
 },
 {
 "orderid": 134,
 "status": "Sent for Pickup",
 "added_time": "2019-10-18T13:15:24.313074+05:45"
 },
 {
 "orderid": 134,
 "status": "Pickup Order Created",
 "added_time": "2019-10-15T11:32:18.149352+05:45"
 }
]
Possible Errors in GET requests:
*If token is not provided
Response Status 401:
{
 "detail": "Authentication credentials were not provided."
}
*If Order ID is missing/empty
Response Status 400:
{
 "detail": "ID parameter missing"
README.md 2026-05-27
6 / 32
}
*If invalid or unknown order id provided
Response Status 404:
{
 "detail": "Not found."
}
Response Status 500:
{
 "detail": "Server Error"
}
POST Create an order
This endpoint allows you to create an order from your system. Vendor must provide necessary details
from their end to create an order through this endpoint.
Link: https://demo.nepalcanmove.com/api/v1/order/create
Headers
Authorization Token <your access token keys>
Params
Params Requirement Description
name required customer name
phone required customer phone number
phone2 optional customer secondary phone
cod_charge required cod amount including delivery
address required general address of customer
fbranch required From branch name
branch required Destination branch name
package optional Package name or type
vref_id optional Vendor reference id
instruction optional Delivery Instruction
README.md 2026-05-27
7 / 32
Params Requirement Description
delivery_type optional
Delivery Type: Door2Door, Branch2Door, Branch2Branch, Door2Branch
(default: Door2Door if not provided)
weight optional Weight in kg (default: 1 kg if not provided)
Example:
curl --location --request POST 'https://demo.nepalcanmove.com/api/v1/order/create'
\
--header 'Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45' \
--header 'Content-Type: application/json' \
--data-raw '{
 "name":"John Doe",
 "phone":"9847023226",
 "phone2":"",
"cod_charge":"2200",
 "address":"Byas Pokhari",
 "fbranch":"TINKUNE",
"branch":"BIRATNAGAR",
 "package": "Jeans Pant",
 "vref_id" : "VREF234",
 "instruction" : "Test Instruction",
 "delivery_type" : "Branch2Door",
 "weight" : "2"
}'
Result:
Status 200
{
 "Message": "Order Successfully Created",
 "orderid": 747
}
Error if fields are missing
Status 400
{
 "Error": {
 "cod_charge": "Invalid COD Amount",
 "phone": "Invalid Phone Number",
 "branch": "Invalid Branch",
 "name": "Invalid Name",
 "address": "Invalid Address"
README.md 2026-05-27
8 / 32
 }
}
POST Create an order comment
This endpoint allows you to create a comment from your system. Vendor must provide necessary
details from their end to create a comment through this endpoint.
Link: https://demo.nepalcanmove.com/api/v1/comment
Headers
Authorization Token <your access token keys>
Params
Params Requirement Description
orderid required order id in ncm portal
comments required text comment to put in order
Example:
curl --location --request POST 'https://demo.nepalcanmove.com/api/v1/comment' \
--header 'Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45' \
--header 'Content-Type: application/json' \
--data-raw '{
 "orderid":"1234567",
 "comments" : "Test comment from api"
}'
Result:
Status 200
{
 "message": "Comment successfully created"
}
Error if fields are missing
README.md 2026-05-27
9 / 32
Status 400
{
 "Error": {
 "Order Id": "Invalid / Empty orderid",
 "Comments": "Invalid / Empty comment",
 }
}
POST Retrieve Order statuses
This endpoint allows you to get status for the order ids provided through this endpoint.
Link: https://demo.nepalcanmove.com/api/v1/orders/statuses
Headers
Authorization Token <your access token keys>
Params
Params Requirement Description
orders required order id in ncm portal
Example:
curl --location --request POST
'https://demo.nepalcanmove.com/api/v1/orders/statuses' \
--header 'Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45' \
--header 'Content-Type: application/json' \
--data-raw '{ "orders": [4041,3855,4032,3841,3842,4042] }'
Result:
Status 200
{
 "result": {
 "4041": "Pickup Order Created",
 "3855": "Arrived",
 "4032": "Drop off Order Created",
README.md 2026-05-27
10 / 32
 "3841": "Delivered",
 "3842": "Delivered"
 },
 "errors": [
 4042
 ]
}
POST Create Generic Vendor Ticket
This endpoint allows vendors to create a general support ticket.
Link: https://demo.nepalcanmove.com/api/v2/vendor/ticket/create/new
Method: POST
Authorization: Token <your_token>
Content-Type: application/json
Params
Params Requirement Description
ticket_type required Type of ticket (see available types below)
message required Message/description (max 500 chars)
branch conditional Required only when ticket_type is Pickup
Available Ticket Types:
General - General inquiries or issues
Order Processing - Order processing related issues
Return - Return/refund related requests
Pickup - Pickup scheduling or issues
Example:
{
 "ticket_type": "Pickup",
 "message": "98XXXXXXXX, No. of Packets: 5, Address: Baneshwor",
 "branch": "Tinkune"
}
Result:
README.md 2026-05-27
11 / 32
Status 201
{
 "message": "Ticket created",
 "ticket": 123
}
Note:
branch is mandatory for Pickup ticket creation.
branch must be one of the vendor's assigned pickup branches.
POST Create COD Transfer Ticket
This endpoint allows vendors to create a COD transfer request ticket.
Link: https://demo.nepalcanmove.com/api/v2/vendor/ticket/cod/create
Method: POST
Authorization: Token <your_token>
Content-Type: application/json
Params
Params Requirement Description
bankName required Name of the bank
bankAccountName required Account holder name
bankAccountNumber required Bank account number
Example:
{
 "bankName": "Nepal Bank Limited",
 "bankAccountName": "John Doe",
 "bankAccountNumber": "1234567890"
}
Result:
Status 201
{
 "message": "COD ticket created",
README.md 2026-05-27
12 / 32
 "ticket": 124
}
POST Close Vendor Ticket
This endpoint allows vendors to close their own tickets.
Link: https://demo.nepalcanmove.com/api/v2/vendor/ticket/close/<ticket_id>
Method: POST
Authorization: Token <your_token>
Content-Type: application/json
Params
Params Requirement Description
pk required Ticket ID (in URL path)
Example:
curl --location --request POST
'https://demo.nepalcanmove.com/api/v2/vendor/ticket/close/123' \
--header 'Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45' \
--header 'Content-Type: application/json'
Result:
Status 200
{
 "message": "Ticket closed",
 "ticket": 123
}
GET Staff List
This endpoint retrieves a paginated list of active staff members.
README.md 2026-05-27
13 / 32
Link: https://demo.nepalcanmove.com/api/v2/vendor/staffs?
q=search_term&page=1&page_size=20
Method: GET
Authorization: Token <your_token>
Query Params
Params Requirement Description
q optional Search staff by name (contains)
page optional Page number (default: 1)
page_size optional Results per page (default: 20, alias: limit)
limit optional Alias for page_size
Example:
curl --location --request GET 'https://demo.nepalcanmove.com/api/v2/vendor/staffs?
q=ram&page=1&limit=10' \
--header 'Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45'
Result:
Status 200
{
 "count": 45,
 "next": "https://demo.nepalcanmove.com/api/v2/vendor/staffs?page=2",
 "previous": null,
 "results": [
 {
 "id": 12,
 "name": "Ram Sharma",
 "email": "ram@example.com",
 "phone": "9841234567"
 }
 ]
}
GET Vendor Assigned Branches
This endpoint returns all pickup branches assigned to the authenticated vendor.
README.md 2026-05-27
14 / 32
Link: https://demo.nepalcanmove.com/api/v2/vendor/assigned-branches
Method: GET
Authorization: Token <your_token>
Query Params
No query params are required.
Example:
curl --location --request GET
'https://demo.nepalcanmove.com/api/v2/vendor/assigned-branches' \
--header 'Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45'
Result:
Status 200
[
 "KATHMANDU",
 "POKHARA",
 "BIRATNAGAR"
]
Note:
Response is a simple array of branch names.
If no branches are assigned, the API returns an empty array [].
POST Return Order
This endpoint allows vendors to mark an order for return process.
Link: https://demo.nepalcanmove.com/api/v2/vendor/order/return
Method: POST
Authorization: Token <your_token>
Content-Type: application/json
Params
Params Requirement Description
pk required Order ID
README.md 2026-05-27
15 / 32
Params Requirement Description
comment optional Comment/reason for the return
Example:
curl --location --request POST
'https://demo.nepalcanmove.com/api/v2/vendor/order/return' \
--header 'Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45' \
--header 'Content-Type: application/json' \
--data-raw '{
 "pk": 4041,
 "comment": "Customer refused the delivery"
}'
Result:
Status 200
{
 "message": "Order marked for return successfully",
 "order": 4041,
 "vendor_return": true
}
Error Responses:
Status 400
{
 "message": "Order ID is required"
}
Status 404
{
 "message": "Order not found"
}
Note:
This sets the order's vendor_return flag to true
If a comment is provided, it creates an external comment with "Pending" status
Only the vendor who owns the order can mark it for return
POST Create Exchange Order
README.md 2026-05-27
16 / 32
This endpoint creates exchange orders for returning items and sending replacements.
Link: https://demo.nepalcanmove.com/api/v2/vendor/order/exchange-create
Method: POST
Authorization: Token <your_token>
Content-Type: application/json
Params
Params Requirement Description
pk required Original order ID
Example:
{
 "pk": 4041
}
Result:
Status 200
{
 "message": "Exchange orders created",
 "cust_order": 4567,
 "ven_order": 4568
}
Note: This creates two orders:
Customer order (cust_order): New delivery to customer
Vendor order (ven_order): Return of old item to vendor
POST Redirect Order
This endpoint allows vendors to redirect an order to a different address/customer.
Link: https://demo.nepalcanmove.com/api/v2/vendor/order/redirect
Method: POST
Authorization: Token <your_token>
Content-Type: application/json
README.md 2026-05-27
17 / 32
Params
Params Requirement Description
pk required Order ID
name required New customer name
phone required New customer phone
address required New customer address
vendorOrderid optional Vendor's reference order ID
destination optional New destination branch ID (if changing)
cod_charge optional New COD amount (decimal value)
Example:
{
 "pk": 4041,
 "name": "New Customer Name",
 "phone": "9841234567",
 "address": "New delivery address, Kathmandu",
 "vendorOrderid": "VORD-12345",
 "destination": 5,
 "cod_charge": 750.5
}
Result:
Status 200
{
 "message": "Order redirected successfully",
 "order": 4041,
 "cod_charge": "500.00",
 "delivery_charge": "175.00",
 "changelogs": "-destination_branch was changed from TINKUNE to POKHARA\ndelivery_charge was changed from 150 to 175\nBranch Changed.\n"
}
Note:
If destination branch is changed, RDRT-DiFF-BRNCH charge is added
If destination remains same, REDIRECT charge is added
Creates new customer record if phone doesn't exist
COD charge can be updated by providing cod_charge parameter (optional)
All changes are logged in order changelogs
README.md 2026-05-27
18 / 32
POST Create/Update Webhook URLs
This endpoint allows vendors to create, update or remove their webhook URLs used by NCM to push
order status and comment events.
Link: https://demo.nepalcanmove.com/api/v2/vendor/webhook
Method: POST
Authorization: Token <your_token>
Content-Type: application/json
Params
Params Requirement Description
webhook_url required Order status webhook URL (must start with http/https)
Notes:
If webhook_url is an empty string, the stored order status webhook URL will be removed.
URLs when provided, must start with http:// or https://.
Example: Set webhooks
{
 "webhook_url": "https://example.com/webhooks/order-status"
}
Example: Remove order status webhook
{
 "webhook_url": ""
}
Result:
Status 200
{
 "success": true,
 "message": "Webhook URLs updated successfully!"
}
or, on first-time creation:
README.md 2026-05-27
19 / 32
Status 201
{
 "success": true,
 "message": "Webhook URLs created successfully!"
}
Error Responses:
Status 400
{
 "success": false,
 "message": "Please enter a valid URL for Order Status Webhook (must start with
http:// or https://)"
}
POST Test Webhook URL
This endpoint sends a test payload to a given webhook URL so vendors can verify that their endpoint is
reachable and correctly processes status updates.
Link: https://demo.nepalcanmove.com/api/v2/vendor/webhook/test
Method: POST
Authorization: Token <your_token>
Content-Type: application/json
Params
Params Requirement Description
webhook_url required Your webhook endpoint URL (http/https)
Test Payload
The API will send a JSON body similar to:
{
 "event": "order.status.changed",
 "order_id": "TEST-123456",
 "status": "In Transit",
 "timestamp": "2024-01-01T12:00:00+05:45",
 "test": true
}
README.md 2026-05-27
20 / 32
Example:
{
 "webhook_url": "https://example.com/webhooks/order-status"
}
Result (success):
Status 200
{
 "success": true,
 "status_code": 200,
 "response": "OK"
}
Result (HTTP error from your server):
Status 200
{
 "success": true,
 "status_code": 400,
 "response": "Bad Request",
 "headers": {
 "Content-Type": "text/plain"
 }
}
Result (connection/timeout error):
Status 200
{
 "success": false,
 "error": "Request timed out. The webhook URL did not respond within 10 seconds."
}
Status 200
{
 "success": false,
 "error": "Connection error. Could not connect to the webhook URL. Details: ..."
}
README.md 2026-05-27
21 / 32
GET Ticket Detail API
Link: https://demo.nepalcanmove.com/api/v1/tickets/<ticket_id>/detail
Method: GET
Authorization: Token <your_token>
Access Rules
Vendor can view only own ticket.
Logistics can view only assigned ticket.
Other roles are forbidden.
Example
curl --location --request GET
'https://demo.nepalcanmove.com/api/v1/tickets/2639/detail' \
--header 'Authorization: Token <your_token>'
Sample Response
Status 200
{
 "success": true,
 "ticket": {
 "id": 2639,
 "ticket_type": "Pickup",
 "message": "dfsdf<br>No. of Packets: 33<br>Address: Pariatur Corporis e <br>
Actual Pickup count : 52",
 "added_on": "2026-04-09T11:28:00+05:45",
 "status": false,
 "comment": "",
 "attachment": null,
 "branch": "BUTWAL",
 "closed_on": null,
 "vendor": {
 "id": 629,
 "name": "Vendor NCM",
 "location": "27.700769,85.300140"
 },
 "assigned_to": {
 "id": 43,
 "name": "Ram Logistics"
 },
 "closed_by": {
 "id": null,
 "name": null
 }
README.md 2026-05-27
22 / 32
 },
 "responses": [
 {
 "id": 901,
 "message": "Please pickup tomorrow morning.",
 "added_on": "2026-04-09T12:10:00+05:45",
 "vendor_display": true,
 "added_by": {
 "id": 629,
 "name": "Vendor NCM"
 }
 }
 ]
}
POST Vendor Ticket Response Create API
Endpoint
Link: https://demo.nepalcanmove.com/api/v1/vendor/tickets/<ticket_id>/response
Method: POST
Authorization: Token <your_token>
Content-Type: application/json
Request Body
{
 "message": "Response text from vendor"
}
Behavior
Creates a ticket response with vendorDisplay=true.
If ticket is closed, it is reopened automatically.
Example
README.md 2026-05-27
23 / 32
curl --location --request POST
'https://demo.nepalcanmove.com/api/v1/vendor/tickets/2639/response' \
--header 'Authorization: Token <your_token>' \
--header 'Content-Type: application/json' \
--data-raw '{
 "message": "Please check this update from vendor side."
}'
Sample Response
Status 201
{
 "success": true,
 "ticket_id": 2639,
 "response": {
 "id": 902,
 "message": "Please check this update from vendor side.",
 "added_on": "2026-04-09T12:35:10+05:45",
 "vendor_display": true,
 "added_by": {
 "id": 629,
 "name": "Vendor NCM"
 }
 }
}
GET Vendor Customer List
Returns a paginated list of customers associated with your vendor account — either created by you or
who have received at least one of your orders.
Link: https://demo.nepalcanmove.com/api/v2/vendor/customers
Method: GET
Authorization: Token <your_token>
Query Params
Params Requirement Description
page optional Page number (default: 1)
page_size optional Results per page (default: 25, maximum: 100)
name optional Filter customers by name (contains)
README.md 2026-05-27
24 / 32
Params Requirement Description
phone optional Filter customers by phone (starts with)
Example:
curl --location --request GET
'https://demo.nepalcanmove.com/api/v2/vendor/customers?page=1' \
--header 'Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45'
Result:
Status 200
{
 "count": 320,
 "next": "https://demo.nepalcanmove.com/api/v2/vendor/customers?page=2",
 "previous": null,
 "results": [
 {
 "id": 109523,
 "name": "John Doe",
 "phone": "9841234567",
 "address": "Baneshwor, Kathmandu"
 },
 {
 "id": 109524,
 "name": "Jane Smith",
 "phone": "9807654321",
 "address": ""
 }
 ]
}
GET Vendor Customer Detail
Returns full profile and complete order history for a specific customer of your vendor account.
Link: https://demo.nepalcanmove.com/api/v2/vendor/customers/<customer_id>/detail
Method: GET
Authorization: Token <your_token>
URL Params
README.md 2026-05-27
25 / 32
Params Requirement Description
customer_id required Customer ID (in URL path)
Example:
curl --location --request GET
'https://demo.nepalcanmove.com/api/v2/vendor/customers/109523/detail' \
--header 'Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45'
Result:
Status 200
{
 "id": 109523,
 "name": "John Doe",
 "phone": "9841234567",
 "email": "john@example.com",
 "orders": [
 {
 "orderid": 74821,
 "created_date": "2026-04-15T10:30:00+05:45",
 "cod_charge": "1500.00",
 "delivery_charge": "150.00",
 "last_delivery_status": "Delivered"
 },
 {
 "orderid": 74100,
 "created_date": "2026-03-10T09:15:00+05:45",
 "cod_charge": "2200.00",
 "delivery_charge": "150.00",
 "last_delivery_status": "Sent to Vendor"
 }
 ]
}
Error Responses:
Status 404
{
 "detail": "Customer not found"
}
Status 404
{
README.md 2026-05-27
26 / 32
 "detail": "Not found"
}
GET Customer Rating Stats
Returns delivery performance stats for a customer by phone number — total orders placed, successful
deliveries, and returns across the entire NCM system.
Link: https://demo.nepalcanmove.com/api/v2/vendor/ratings?phone=<phone>
Method: GET
Authorization: Token <your_token>
Query Params
Params Requirement Description
phone required Customer's phone number
Example:
curl --location --request GET
'https://demo.nepalcanmove.com/api/v2/vendor/ratings?phone=9841234567' \
--header 'Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45'
Result:
Status 200
{
 "phone": "9841234567",
 "total_orders": 18,
 "total_delivered": 15,
 "total_returned": 3
}
Error Responses:
Status 400
{
 "detail": "phone parameter is required"
}
README.md 2026-05-27
27 / 32
Status 404
{
 "detail": "No customer found with this phone number"
}
GET Order Label Data (Single Order)
Returns all information needed to render a delivery label for a specific order. Only the authenticated
vendor's own orders are accessible.
Link: https://demo.nepalcanmove.com/api/v2/vendor/order/label/<order_id>
Method: GET
Authorization: Token <your_token>
URL Params
Params Requirement Description
order_id required Order ID (in URL path)
Example:
curl --location --request GET
'https://demo.nepalcanmove.com/api/v2/vendor/order/label/346844' \
--header 'Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45'
Result:
Status 200
{
 "orderid": 346844,
 "delivery_type": "Home",
 "cod_charge": "1500.00",
 "from_branch": {
 "name": "TINKUNE",
 "code": "TINK1",
 "district": "Kathmandu"
 },
 "to_branch": {
 "name": "BIRATNAGAR",
 "code": "BIRA1",
 "district": "Morang"
 },
README.md 2026-05-27
28 / 32
 "from": {
 "name": "Vendor Name",
 "phone": "9841000000",
 "phone2": ""
 },
 "receiver": {
 "name": "John Doe",
 "phone": "9847000000",
 "phone2": "",
 "address": "Baneshwor, Kathmandu"
 },
 "description": {
 "description": "Blue jeans",
 "delivery_instruction": "Handle carefully",
 "handling": "Non-Fragile",
 "vendor_orderid": "VREF-123"
 }
}
Error Responses:
Status 404
{
 "detail": "Order not found"
}
POST Order Label Data (Multiple Orders)
Returns label data for multiple orders in a single request. Pass an array of order IDs in the request
body. Only orders belonging to the authenticated vendor are returned.
Link: https://demo.nepalcanmove.com/api/v2/vendor/order/label/
Method: POST
Authorization: Token <your_token>
Content-Type: application/json
Body Params
Params Requirement Description
ids required Array of integer order IDs (must be non-empty)
Example:
README.md 2026-05-27
29 / 32
curl --location --request POST
'https://demo.nepalcanmove.com/api/v2/vendor/order/label/' \
--header 'Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45' \
--header 'Content-Type: application/json' \
--data-raw '{
 "ids": [346844, 346845, 99999]
}'
Result:
Status 200
{
 "labels": [
 {
 "orderid": 346844,
 "delivery_type": "Home",
 "cod_charge": "1500.00",
 "from_branch": {
 "name": "TINKUNE",
 "code": "TINK1",
 "district": "Kathmandu"
 },
 "to_branch": {
 "name": "BIRATNAGAR",
 "code": "BIRA1",
 "district": "Morang"
 },
 "from": {
 "name": "Vendor Name",
 "phone": "9841000000",
 "phone2": ""
 },
 "receiver": {
 "name": "John Doe",
 "phone": "9847000000",
 "phone2": "",
 "address": "Baneshwor, Kathmandu"
 },
 "description": {
 "description": "Blue jeans",
 "delivery_instruction": "Handle carefully",
 "handling": "Non-Fragile",
 "vendor_orderid": "VREF-123"
 }
 },
 {
 "orderid": 346845,
 "delivery_type": "Office",
 "cod_charge": "2200.00",
 ...
README.md 2026-05-27
30 / 32
 }
 ],
 "not_found": [99999]
}
Response Fields
Field Type Description
labels
array of
objects
Label data for every ID that was found and belongs to this vendor. Same
structure as GET.
not_found
array of
integers
IDs from the request that were not found or belong to a different vendor.
Empty [] if all were found.
Error Responses:
Status 400
{
 "detail": "\"ids\" must be a non-empty array"
}
Status 401
{
 "detail": "Authentication credentials were not provided."
}
Notes:
delivery_type returns "Office" for D2B/B2B orders and "Home" for all others.
from contains vendor details for Vendor-type orders, or sender customer details otherwise.
description fields are null if no description was added to the order.
handling will be "Fragile", "Fragile and Valuable", "Valuable", or "Non-Fragile".
IDs belonging to a different vendor are silently returned in not_found — same as a wrong ID.
Order of items in labels may not match the order of ids in the request. Match by orderid on the
client side if order matters.
Keep batch sizes reasonable (recommended ≤ 100 IDs per request).
Please use this api endpoints very carefully.
Avoid duplication of order creation from both bulk file upload and api system.
No Spamming or running scripts to overload the server.
README.md 2026-05-27
31 / 32
Tel: 015199684
Tinkune, Kathmandu
Nepal Can Move
README.md 2026-05-27
32 / 32