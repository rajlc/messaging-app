NCM API DOCUMENTATION
NCM API COLLECTION

What is NCM API?
NCM API service gives you the capability to integrate your online system with NCM's portal.
Our API service currently provides you the capability to
[

] Fetch Particular Order Details

[

] Fetch Order Comments

[

] Fetch last 25 comments of orders

[

] Fetch Order Status

[

] Create a new Order right from your own system

API Limits
Order Creation : 1,000 per day
Order View (Detail, Comments, Status ): 20,000 per day

Every vendor is provided with an API Token Key. Use this api token key to
make an api request into the server.
If you forgot the token or want to request new token, contact our IT
Admin.
GET Branch Lists with details
This endpoint allows to fetch the list of all branches of NCM with their details like phone
number, covered areas, district, regions etc.
plaintext
Link: https://demo.nepalcanmove.com/api/v2/branches

GET Delivery Charges between branches
This endpoint allows to calculate the delivery charge for the branches.

plaintext
Link: https://demo.nepalcanmove.com/api/v1/shipping-rate?creation=TINKUNE&destinatio
Params:
creation : pickup branch
destination : destination branch to where order needs to be send
type : delivery type

Available Delivery Types for 'type' parameter:

Type Value
Pickup/Collect
Send

D2B

B2B

Charge

Description
Door2Door (NCM pickup & delivery)
Branch2Door (Sender drops at branch, NCM
delivers at door)

Calculation
Full base charge
Full base charge

Door2Branch (NCM pick, Customer collect at

Base charge -

branch)

50

Branch2Branch (Sender Drop at branch &

Base charge -

customer collect at branch)

50

Headers
plaintext
Authorization

Token <your token keys>

GET Order Details
This endpoint allows to fetch the details of a particular order in your system. These details
are the same as the details you see on the NCM portal when you view a particular order.
plaintext
Link: https://demo.nepalcanmove.com/api/v1/order?id=ORDERID

Headers
plaintext
Authorization

Token <your token keys>

Params
plaintext
id

ORDERID

your order id in ncm system

Example:
plaintext
curl --location --request GET https://demo.nepalcanmove.com/api/v1/order?id=134 \
--header "Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45" \

Result:
plaintext
Response Status 200
{
"orderid": 134,
"cod_charge": "1710.00",
"delivery_charge": "99.00",
"last_delivery_status": "Delivered",
"payment_status": "Completed"
}

GET Order Comments
This endpoint allows to fetch the comments of a particular order in your system. The api will
provide all the comments done in a particular order. Comments will be in descending order
of created date.
plaintext
Link: https://demo.nepalcanmove.com/api/v1/order/comment?id=ORDERID

Headers
plaintext
Authorization

Params

Token <your access token keys>

plaintext
id

ORDERID

your order id in ncm system

Example:
plaintext
curl --location --request GET https://demo.nepalcanmove.com/api/v1/order/comment?id=
--header "Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45" \

Result:
plaintext
Response Status 200
[
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
This endpoint allows to fetch the last 25 comments done to your orders. Latest comments
will be fetched at the top.

plaintext
Link: https://demo.nepalcanmove.com/api/v1/order/getbulkcomments

Headers
plaintext
Authorization

Token <your access token keys>

Example:
plaintext
curl --location --request GET https://demo.nepalcanmove.com/api/v1/order/getbulkcomm
--header "Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45"

Result:

plaintext
Response Status 200
[
{
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
This endpoint allows to fetch the status of a particular order in your system. The api will
provide all the status of a particular order. Statuses will be in descending order of created
date.
plaintext
Link: https://demo.nepalcanmove.com/api/v1/order/status?id=ORDERID

Headers

plaintext
Authorization

Token <your access token keys>

Params
plaintext
id

ORDERID

your order id in ncm system

Example:
plaintext
curl --location --request GET https://demo.nepalcanmove.com/api/v1/order/status?id=1
--header "Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45"

Result:

plaintext
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

plaintext
*If token is not provided
Response Status 401:
{
"detail": "Authentication credentials were not provided."
}
*If Order ID is missing/empty
Response Status 400:
{
"detail": "ID parameter missing"
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
This endpoint allows you to create an order from your system. Vendor must provide
necessary details from their end to create an order through this endpoint.
plaintext
Link: https://demo.nepalcanmove.com/api/v1/order/create

Headers
plaintext
Authorization

Params

Token <your access token keys>

Params

Requirement

Description

name

required

customer name

phone

required

customer phone number

phone2

optional

customer secondary phone

cod_charge

required

cod amount including delivery

address

required

general address of customer

fbranch

required

From branch name

branch

required

Destination branch name

package

optional

Package name or type

vref_id

optional

Vendor reference id

instruction

optional

Delivery Instruction
Delivery Type: Door2Door, Branch2Door,

delivery_type

optional

Branch2Branch, Door2Branch (default: Door2Door if not
provided)

weight

optional

Weight in kg (default: 1 kg if not provided)

Example:
plaintext
curl --location --request POST 'https://demo.nepalcanmove.com/api/v1/order/create' \
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
plaintext
Status 200
{
"Message": "Order Successfully Created",
"orderid": 747
}

Error if fields are missing
plaintext
Status 400
{
"Error": {
"cod_charge": "Invalid COD Amount",
"phone": "Invalid Phone Number",
"branch": "Invalid Branch",
"name": "Invalid Name",
"address": "Invalid Address"
}
}

POST Create an order comment
This endpoint allows you to create a comment from your system. Vendor must provide
necessary details from their end to create a comment through this endpoint.
plaintext
Link: https://demo.nepalcanmove.com/api/v1/comment

Headers
plaintext
Authorization

Params

Token <your access token keys>

Params

Requirement

Description

orderid

required

order id in ncm portal

comments

required

text comment to put in order

Example:
plaintext
curl --location --request POST 'https://demo.nepalcanmove.com/api/v1/comment' \
--header 'Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45' \
--header 'Content-Type: application/json' \
--data-raw '{
"orderid":"1234567",
"comments" : "Test comment from api"
}'

Result:
plaintext
Status 200
{
"message": "Comment successfully created"
}

Error if fields are missing
plaintext
Status 400
{
"Error": {
"Order Id": "Invalid / Empty orderid",
"Comments": "Invalid / Empty comment",
}
}

POST Retrieve Order statuses
This endpoint allows you to get status for the order ids provided through this endpoint.

plaintext
Link: https://demo.nepalcanmove.com/api/v1/orders/statuses

Headers
plaintext
Authorization

Token <your access token keys>

Params
Params

Requirement

orders

required

Description
order id in ncm portal

Example:
plaintext
curl --location --request POST 'https://demo.nepalcanmove.com/api/v1/orders/statuses
--header 'Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45' \
--header 'Content-Type: application/json' \
--data-raw '{ "orders": [4041,3855,4032,3841,3842,4042] }'

Result:
plaintext
Status 200
{
"result": {
"4041": "Pickup Order Created",
"3855": "Arrived",
"4032": "Drop off Order Created",
"3841": "Delivered",
"3842": "Delivered"
},
"errors": [
4042
]
}

POST Create Generic Vendor Ticket
This endpoint allows vendors to create a general support ticket.
plaintext
Link: https://demo.nepalcanmove.com/api/v2/vendor/ticket/create
Method: POST
Authorization: Token <your_token>
Content-Type: application/json

Params
Params

Requirement

Description

ticket_type

required

Type of ticket (see available types below)

message

required

Message/description (max 500 chars)

Available Ticket Types:
General - General inquiries or issues
Order Processing - Order processing related issues
Return - Return/refund related requests
Pickup - Pickup scheduling or issues

Example:
json
{
"ticket_type": "General",
"message": "Please arrange delivery at the earliest"
}

Result:
json
Status 201
{
"message": "Ticket created",
"ticket": 123
}

POST Create COD Transfer Ticket
This endpoint allows vendors to create a COD transfer request ticket.
plaintext
Link: https://demo.nepalcanmove.com/api/v2/vendor/ticket/cod/create
Method: POST
Authorization: Token <your_token>
Content-Type: application/json

Params
Params

Requirement

Description

bankName

required

Name of the bank

bankAccountName

required

Account holder name

bankAccountNumber

required

Bank account number

Example:
json
{
"bankName": "Nepal Bank Limited",
"bankAccountName": "John Doe",
"bankAccountNumber": "1234567890"
}

Result:
json
Status 201
{
"message": "COD ticket created",
"ticket": 124
}

POST Close Vendor Ticket
This endpoint allows vendors to close their own tickets.

plaintext
Link: https://demo.nepalcanmove.com/api/v2/vendor/ticket/close/<ticket_id>
Method: POST
Authorization: Token <your_token>
Content-Type: application/json

Params
Params
pk

Requirement
required

Description
Ticket ID (in URL path)

Example:
plaintext
curl --location --request POST 'https://demo.nepalcanmove.com/api/v2/vendor/ticket/c
--header 'Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45' \
--header 'Content-Type: application/json'

Result:
json
Status 200
{
"message": "Ticket closed",
"ticket": 123
}

GET Staff List
This endpoint retrieves a paginated list of active staff members.
plaintext
Link: https://demo.nepalcanmove.com/api/v2/vendor/staffs?q=search_term&page=1&page_s
Method: GET
Authorization: Token <your_token>

Query Params

Params

Requirement

Description

q

optional

Search staff by name (contains)

page

optional

Page number (default: 1)

page_size

optional

Results per page (default: 20, alias: limit)

limit

optional

Alias for page_size

Example:
plaintext
curl --location --request GET 'https://demo.nepalcanmove.com/api/v2/vendor/staffs?q=
--header 'Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45'

Result:
json
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

POST Return Order
This endpoint allows vendors to mark an order for return process.

plaintext
Link: https://demo.nepalcanmove.com/api/v2/vendor/order/return
Method: POST
Authorization: Token <your_token>
Content-Type: application/json

Params
Params

Requirement

Description

pk

required

Order ID

comment

optional

Comment/reason for the return

Example:
plaintext
curl --location --request POST 'https://demo.nepalcanmove.com/api/v2/vendor/order/re
--header 'Authorization: Token a3dede0dcfb45e2af76ced9f7a74909aac9d0a45' \
--header 'Content-Type: application/json' \
--data-raw '{
"pk": 4041,
"comment": "Customer refused the delivery"
}'

Result:
json
Status 200
{
"message": "Order marked for return successfully",
"order": 4041,
"vendor_return": true
}

Error Responses:

json
Status 400
{
"message": "Order ID is required"
}

json
Status 404
{
"message": "Order not found"
}

Note:
This sets the order's vendor_return flag to true
If a comment is provided, it creates an external comment with "Pending" status
Only the vendor who owns the order can mark it for return

POST Create Exchange Order
This endpoint creates exchange orders for returning items and sending replacements.
plaintext
Link: https://demo.nepalcanmove.com/api/v2/vendor/order/exchange-create
Method: POST
Authorization: Token <your_token>
Content-Type: application/json

Params
Params
pk

Example:

Requirement
required

Description
Original order ID

json
{
"pk": 4041
}

Result:
json
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
plaintext
Link: https://demo.nepalcanmove.com/api/v2/vendor/order/redirect
Method: POST
Authorization: Token <your_token>
Content-Type: application/json

Params

Params

Requirement

Description

pk

required

Order ID

name

required

New customer name

phone

required

New customer phone

address

required

New customer address

vendorOrderid

optional

Vendor's reference order ID

destination

optional

New destination branch ID (if changing)

cod_charge

optional

New COD amount (decimal value)

Example:
json
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
json
Status 200
{
"message": "Order redirected successfully",
"order": 4041,
"cod_charge": "500.00",
"delivery_charge": "175.00",
"changelogs": "-destination_branch was changed from TINKUNE to POKHARA\n-delivery_
}

Note:
If destination branch is changed, RDRT-DiFF-BRNCH charge is added
If destination remains same, REDIRECT charge is added

Creates new customer record if phone doesn't exist
COD charge can be updated by providing cod_charge parameter (optional)
All changes are logged in order changelogs

POST Create/Update Webhook URLs
This endpoint allows vendors to create, update or remove their webhook URLs used by NCM
to push order status and comment events.
plaintext
Link: https://demo.nepalcanmove.com/api/v2/vendor/webhook
Method: POST
Authorization: Token <your_token>
Content-Type: application/json

Params
Params

Requirement

webhook_url

required

Description
Order status webhook URL (must start with http/https)

Notes:
If webhook_url is an empty string, the stored order status webhook URL will be removed.
URLs when provided, must start with http:// or https:// .

Example: Set webhooks
json
{
"webhook_url": "https://example.com/webhooks/order-status"
}

Example: Remove order status webhook
json
{
"webhook_url": ""
}

Result:

json
Status 200
{
"success": true,
"message": "Webhook URLs updated successfully!"
}

or, on first-time creation:
json
Status 201
{
"success": true,
"message": "Webhook URLs created successfully!"
}

Error Responses:
json
Status 400
{
"success": false,
"message": "Please enter a valid URL for Order Status Webhook (must start with htt
}

POST Test Webhook URL
This endpoint sends a test payload to a given webhook URL so vendors can verify that their
endpoint is reachable and correctly processes status updates.
plaintext
Link: https://demo.nepalcanmove.com/api/v2/vendor/webhook/test
Method: POST
Authorization: Token <your_token>
Content-Type: application/json

Params

Params

Requirement

webhook_url

required

Description
Your webhook endpoint URL (http/https)

Test Payload
The API will send a JSON body similar to:
json
{
"event": "order.status.changed",
"order_id": "TEST-123456",
"status": "In Transit",
"timestamp": "2024-01-01T12:00:00+05:45",
"test": true
}

Example:
json
{
"webhook_url": "https://example.com/webhooks/order-status"
}

Result (success):
json
Status 200
{
"success": true,
"status_code": 200,
"response": "OK"
}

Result (HTTP error from your server):

json
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
json
Status 200
{
"success": false,
"error": "Request timed out. The webhook URL did not respond within 10 seconds."
}

json
Status 200
{
"success": false,
"error": "Connection error. Could not connect to the webhook URL. Details: ..."
}

Please use this api endpoints very carefully.
Avoid duplication of order creation from both bulk file upload and api system.
No Spamming or running scripts to overload the server.

Tel: 015199684
Tinkune, Kathmandu
Nepal Can Move

