Latest update:
2024-05-24 11:06:08
1299
PrintAWB
GET/POST
/order/package/document/get
Description：Use this API to retrieve order-related documents, only for shipping labels.
Service Endpoints
Region
Endpoint
Myanmar
https://api.shop.com.mm/rest
Bangladesh
https://api.daraz.com.bd/rest
Pakistan
https://api.daraz.pk/rest
Sri Lanka
https://api.daraz.lk/rest
Nepal
https://api.daraz.com.np/rest
Common Parameters
Name
Type
Required or not
Description
app_key
String
Yes
Unique app ID issued by DARAZ Open Platform console when you apply for an app category
timestamp
String
Yes
The time stamp of the request e.g. 1517820392000 (which translates to 5 February 2018 08:46:32) with less than 7200s difference from UTC time
access_token
String
Yes
API interface call credentials
sign_method
String
Yes
The HMAC hash algorithm you are using to calculate your signature
sign
String
Yes
Part of the authentication process that is used for identifying and verifying who is sending a request (click <a target='_blank' href='https://open.daraz.com/doc/doc.htm#?nodeId=10450&docId=108068'>here</a> for details)
Parameter
Name
Type
Required or not
Description
getDocumentReq
Object
Yes
request body
Response Parameters
Name
Type
Description
result
Object
resp body
Error code
Error code
Error message
Solution
No Data
GET/POST
/order/package/document/get
JAVA
PHP
.NET
RUBY
PYTHON
CURL
IopClient client = new IopClient(url, appkey, appSecret);
IopRequest request = new IopRequest();
request.setApiName("/order/package/document/get");
request.addApiParameter("getDocumentReq", "{\"doc_type\":\"PDF\",\"print_item_list\":\"false\",\"packages\":[{\"package_id\":\"FP234234\"},{\"package_id\":\"FP234234\"}]}");
IopResponse response = client.execute(request, accessToken);
System.out.println(response.getBody());
Thread.sleep(10);

Streamlined Return
{
  "result": {
    "error_msg": "package not found",
    "data": {
      "file": "PGlmcmFtZSBzcm",
      "pdf_url": "http://www.test.com/xxx.pdf",
      "doc_type": "PDF"
    },
    "success": "true",
    "error_code": "123"
  },
  "code": "0",
  "request_id": "0ba2887315178178017221014"
}


Latest update:
2024-05-24 11:05:49
1433
ReadyToShip
POST
/order/package/rts
Description：Use this API to mark an order item as being ready to ship.
Service Endpoints
Region
Endpoint
Myanmar
https://api.shop.com.mm/rest
Bangladesh
https://api.daraz.com.bd/rest
Pakistan
https://api.daraz.pk/rest
Sri Lanka
https://api.daraz.lk/rest
Nepal
https://api.daraz.com.np/rest
Common Parameters
Name
Type
Required or not
Description
app_key
String
Yes
Unique app ID issued by DARAZ Open Platform console when you apply for an app category
timestamp
String
Yes
The time stamp of the request e.g. 1517820392000 (which translates to 5 February 2018 08:46:32) with less than 7200s difference from UTC time
access_token
String
Yes
API interface call credentials
sign_method
String
Yes
The HMAC hash algorithm you are using to calculate your signature
sign
String
Yes
Part of the authentication process that is used for identifying and verifying who is sending a request (click <a target='_blank' href='https://open.daraz.com/doc/doc.htm#?nodeId=10450&docId=108068'>here</a> for details)
Parameter
Name
Type
Required or not
Description
readyToShipReq
Object
Yes
request body
Response Parameters
Name
Type
Description
result
Object
resp body
Error code
Error code
Error message
Solution
No Data
POST
/order/package/rts
JAVA
PHP
.NET
RUBY
PYTHON
CURL
IopClient client = new IopClient(url, appkey, appSecret);
IopRequest request = new IopRequest();
request.setApiName("/order/package/rts");
request.addApiParameter("readyToShipReq", "{\"packages\":[{\"package_id\":\"FP234234\"},{\"package_id\":\"FP234234\"}]}");
IopResponse response = client.execute(request, accessToken);
System.out.println(response.getBody());
Thread.sleep(10);

Streamlined Return
{
  "result": {
    "error_msg": "package not found",
    "data": {
      "packages": [
        {
          "msg": "package already cancelled",
          "item_err_code": "600002",
          "package_id": "FP038524014",
          "retry": "false"
        }
      ]
    },
    "success": "true",
    "error_code": "11"
  },
  "code": "0",
  "request_id": "0ba2887315178178017221014"
}
