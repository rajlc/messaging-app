# Create Order

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/method/logi360.api.create_order:
    post:
      summary: Create Order
      deprecated: false
      description: >-
        ## Create Order


        **Endpoint:**  

        `POST {baseUrl}/api/method/logi360.api.create_order`


        **Description:** Creates a vendor order.


        **Headers:**

        ```

        Authorization: token <api_key>:<api_secret>

        Content-Type: application/json

        ```


        **Request Body Fields:**  

        | Field | Type | Required | Description |

        |-------|------|----------|-------------|

        | vendorTrackingNumber | string | No | The vendor tracking number
        associated with the order. ( Referece ID) |

        | codAmount | number | Yes | COD amount (0 if paid), The Cash on
        Delivery (COD) amount includes both the product price and the delivery
        charge. <br>*COD = Product Price + Delivery Charge*|

        | orderDescription | string | Yes | Order description |

        | customerName | string | Yes | Customer name |

        | landmark | string | No | Landmark |

        | primaryMobileNo | string | Yes | Primary contact (10 digits) |

        | secondaryMobileNo | string | No | Secondary contact (10 digits) |

        | destinationBranch | string | Yes | Destination branch <br> *[Get
        Branches API](/get-branches-20060149e0)*|

        | destinationCityArea | string | Yes | Destination area |

        | weight | number | No | Package weight (kg) |

        | orderType | string | No | Default `Regular` |

        | instruction | string | No | Special instructions |

        | businessAddress | string | No | Pickup address  <br> *[Get Business
        Address API](/get-business-address-20060150e0)* |

        | ref | string | No | your identity given by pick & drop |

        | dimWeight             | object           | No       | Dimensional
        weight details of the package |

        | dimWeight.length      | number           | Yes      | Length of the
        package |

        | dimWeight.width       | number           | Yes      | Width of the
        package |

        | dimWeight.height      | number           | Yes      | Height of the
        package |

        | dimWeight.unit        | string           | Yes      | Unit of
        measurement for dimensions ("Inch","Meter","cm")  Default `cm` |

        | customerLatitude | string | No | Latitude of  customer Geolocation |

        | customerLongitude | string | No | Longitude of  customer Geolocation |

        | log | array | No | Order status logs |


        **Example Request -1 :**

        ```bash

        curl -X POST
        "https://app-t.pickndropnepal.com/api/method/logi360.api.create_order" \
          -H "Authorization: token bf1a7ce75dacf51:63b8931e70aee27" \
          -H "Content-Type: application/json" \
          -d '{
            "customerName": "Prasant",
            "primaryMobileNo": "1234567890",
            "destinationBranch": "KATHMANDU VALLEY",
            "codAmount": 200.00,
            "orderDescription": "A package containing electronics",
            "weight": 1
          }'


        let response = await
        fetch("https://app-t.pickndropnepal.com/api/method/logi360.api.create_order",
        { 
          method: "POST",
          body: bodyContent,
          headers: headersList
        });


        let data = await response.text();

        console.log(data);

        ```


        **Example Request -2 :**


        ```bash

        curl -X POST
        'https://app-t.pickndropnepal.com/api/method/logi360.api.create_order' \
          --header 'Authorization: token bf1a7ce75dacf51:63b8931e70aee27' \
          --header 'Content-Type: application/json' \
          --data-raw '{
            "customerName": "Prasant",
            "primaryMobileNo": "1234567890",
            "secondaryMobileNo": "0987654321",
            "destinationCityArea": "Downtown Town",
            "landmark": "123 Main St, Suite 100",
            "destinationBranch": "KATHMANDU VALLEY",
            "codAmount": 200.00,
            "orderDescription": "A package containing electronics",
            "instruction": "Handle with care",
            "Weight": 1,
            "dimWeight": {
              "length": 30,
              "width": 20,
              "height": 15,
              "unit": "cm"
            },
            "customerLatitude": "27.7172",
            "customerLongitude": "85.3240",
            "ref": "software_name",
            "log": [
              { "status": "Order Initialized", "timestamp": "2025-05-13T09:00:00Z" },
              { "status": "Validated Customer Info", "timestamp": "2025-05-13T09:01:30Z" },
              { "status": "Awaiting Submission", "timestamp": "2025-05-13T09:02:00Z" }
            ]
          }'
      tags:
        - Orders
      parameters:
        - name: Authorization
          in: header
          description: ''
          required: false
          example: token bf1a7ce75dacf51:63b8931e70aee27
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                vendorTrackingNumber:
                  type: string
                  description: >
                    The vendor tracking number associated with the order. (
                    Referece ID)
                codAmount:
                  type: number
                  description: >-
                    The Cash on Delivery (COD) amount includes both the product
                    price and the delivery charge.

                    COD = Product Price + Delivery Charge
                orderDescription:
                  type: string
                  description: Description of the order
                customerName:
                  type: string
                  description: Name of the customer
                landmark:
                  type: string
                primaryMobileNo:
                  type: string
                secondaryMobileNo:
                  type: string
                destinationBranch:
                  type: string
                destinationCityArea:
                  type: string
                weight:
                  type: number
                orderType:
                  type: string
                  default: Regular
                instruction:
                  type: string
                businessAddress:
                  type: string
                  description: >-
                    Optional – only needed if the business has more than one
                    pickup address.
                dimWeight:
                  type: object
                  properties:
                    length:
                      type: number
                    width:
                      type: number
                    height:
                      type: number
                    unit:
                      type: string
                      enum:
                        - Inch
                        - Meter
                        - cm
                  x-apidog-orders:
                    - length
                    - width
                    - height
                    - unit
                log:
                  type: array
                  items:
                    type: object
                    properties:
                      status:
                        type: string
                      timestamp:
                        type: string
                        format: date-time
                    x-apidog-orders:
                      - status
                      - timestamp
                ref:
                  type: string
                  x-apidog-mock: '{{$lorem.text}}'
                customerLatitude:
                  type: string
                customerLongitude:
                  type: string
              required:
                - customerName
                - primaryMobileNo
                - destinationBranch
                - codAmount
                - orderDescription
              x-apidog-orders:
                - vendorTrackingNumber
                - codAmount
                - orderDescription
                - customerName
                - primaryMobileNo
                - destinationBranch
                - landmark
                - secondaryMobileNo
                - destinationCityArea
                - weight
                - orderType
                - instruction
                - businessAddress
                - dimWeight
                - customerLatitude
                - customerLongitude
                - ref
                - log
            example:
              customerName: Prasant
              primaryMobileNo: '1234567890'
              secondaryMobileNo: '0987654321'
              destinationCityArea: Downtown Town
              landmark: 123 Main St, Suite 100
              destinationBranch: Lalitpur
              codAmount: 200
              orderType: Regular
              orderDescription: A package containing electronics
              instruction: Handle with care
              weight: 1
              businessAddress: Balaju
              ref: apidog.com
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: object
                    properties:
                      status:
                        type: string
                      message:
                        type: string
                      data:
                        type: object
                        properties:
                          delivery_charge:
                            type: integer
                          orderID:
                            type: string
                          status:
                            type: string
                          vendor_tracking_number:
                            type: string
                          tracking_url:
                            type: string
                        required:
                          - delivery_charge
                          - orderID
                          - status
                          - vendor_tracking_number
                          - tracking_url
                        x-apidog-orders:
                          - delivery_charge
                          - orderID
                          - status
                          - vendor_tracking_number
                          - tracking_url
                    required:
                      - status
                      - message
                      - data
                    x-apidog-orders:
                      - status
                      - message
                      - data
                required:
                  - message
                x-apidog-orders:
                  - message
              example:
                message:
                  status: success
                  message: Order created successfully.
                  data:
                    delivery_charge: 200
                    orderID: XGAC-17
                    status: Open
                    vendor_tracking_number: XGAC-17
                    tracking_url: https://pickndropnepal.com/tracking/PND-191-598-796
          headers: {}
          x-apidog-name: OK
        '400':
          description: >-
            ### Error Response


            **Status Code:** 400 Bad Request


            | Field       | Type      | Max Length |
            Description                                           |

            |------------|-----------|------------|-------------------------------------------------------|

            | success    | boolean   | 10         | Indicates whether the API
            request was successful.    |

            | message    | string    | 100        | Describes the encountered
            error.                     |

            | error_code | integer   | 5          | Error code associated with
            the encountered error.    |

            | data       | object    | -          | Additional data related to
            the error.                |
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  error_code:
                    type: string
                  message:
                    type: string
                  data:
                    type: object
                    properties: {}
                    x-apidog-orders: []
                required:
                  - success
                  - error_code
                  - message
                  - data
                x-apidog-orders:
                  - success
                  - error_code
                  - message
                  - data
              example:
                success: false
                error_code: error_code
                message: <error_message>
                data: {}
          headers: {}
          x-apidog-name: Bad Request
      security: []
      x-apidog-folder: Orders
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1032358/apis/api-20060151-run
components:
  schemas: {}
  securitySchemes:
    ApiTokenAuth:
      type: apikey
      in: header
      name: Authorization
      description: 'Format: token <api_key>:<api_secret>'
servers:
  - url: https://app-t.pickndropnepal.com
    description: Test Environment
  - url: https://pickndropnepal.com
    description: Production Environment
security:
  - ApiTokenAuth: []
    x-apidog:
      schemeGroups:
        - id: 44qFUSysVW2GKLbPKOV1o
          schemeIds:
            - ApiTokenAuth
      required: true
      use:
        id: 44qFUSysVW2GKLbPKOV1o
      scopes:
        44qFUSysVW2GKLbPKOV1o:
          ApiTokenAuth: []

```
# Cancel Order

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/method/logi360.api.cancel_order:
    put:
      summary: Cancel Order
      deprecated: false
      description: >-
        ## Cancel Order


        **Endpoint:**  

        `PUT {baseUrl}/api/method/logi360.api.cancel_order`


        **Description:** Cancels an existing order.


        **Headers:**

        ```

        Authorization: token <api_key>:<api_secret>

        Content-Type: application/json

        ```


        **Request Body:**

        | Field | Type | Required | Description |

        |-------|------|----------|-------------|

        | orderID | string | Yes | Order ID to cancel |


        **Example Request:**

        ```javascript

        let headersList = {
          "Authorization": "token bf1a7ce75dacf51:63b8931e70aee27",
          "Content-Type": "application/json"
        };


        let bodyContent = JSON.stringify({
          "orderID": "XGAD-8"
        });


        let response = await
        fetch("https://app-t.pickndropnepal.com/api/method/logi360.api.cancel_order",
        { 
          method: "PUT",
          body: bodyContent,
          headers: headersList
        });


        let data = await response.text();

        console.log(data);

        ```
      tags:
        - Orders
      parameters:
        - name: Authorization
          in: header
          description: ''
          required: false
          example: token bf1a7ce75dacf51:63b8931e70aee27
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                orderID:
                  type: string
                  x-apidog-mock: '{{$string.alphanumeric}}'
              required:
                - orderID
              x-apidog-orders:
                - orderID
            example:
              orderID: XGAD-8
      responses:
        '200':
          description: Order canceled successfully.
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: object
                    properties:
                      status:
                        type: string
                      message:
                        type: string
                      data:
                        type: string
                    required:
                      - status
                      - message
                      - data
                    x-apidog-orders:
                      - status
                      - message
                      - data
                required:
                  - message
                x-apidog-orders:
                  - message
              example:
                message:
                  status: success
                  message: Order canceled successfully.
                  data: XGAD-8
          headers: {}
          x-apidog-name: OK
        '400':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: object
                    properties:
                      status:
                        type: string
                      error_code:
                        type: string
                      message:
                        type: string
                    required:
                      - status
                      - error_code
                      - message
                    x-apidog-orders:
                      - status
                      - error_code
                      - message
                required:
                  - message
                x-apidog-orders:
                  - message
              example:
                message:
                  status: error
                  error_code: '404'
                  message: Order Not Found
          headers: {}
          x-apidog-name: Bad Request
      security: []
      x-apidog-folder: Orders
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1032358/apis/api-20060152-run
components:
  schemas: {}
  securitySchemes:
    ApiTokenAuth:
      type: apikey
      in: header
      name: Authorization
      description: 'Format: token <api_key>:<api_secret>'
servers:
  - url: https://app-t.pickndropnepal.com
    description: Test Environment
  - url: https://pickndropnepal.com
    description: Production Environment
security:
  - ApiTokenAuth: []
    x-apidog:
      schemeGroups:
        - id: 44qFUSysVW2GKLbPKOV1o
          schemeIds:
            - ApiTokenAuth
      required: true
      use:
        id: 44qFUSysVW2GKLbPKOV1o
      scopes:
        44qFUSysVW2GKLbPKOV1o:
          ApiTokenAuth: []

```
# Get Order Details

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/method/logi360.api.get_order_details:
    get:
      summary: Get Order Details
      deprecated: false
      description: >
        ## Get Order Details


        **Endpoint:**  

        `GET
        https://app-t.pickndropnepal.com/api/method/logi360.api.get_order_details`


        **Description:** Retrieves detailed information about an order.


        **Headers:**

        ```

        Authorization: token <api_key>:<api_secret>

        Content-Type: application/json

        ```


        **Request Query/Body:**  

        | Field | Type | Required | Description |

        |-------|------|----------|-------------|

        | order_id | string | Yes | Order ID / Reference ID |


        **Example Request:**

        ```javascript

        let headersList = {
          "Authorization": "token bf1a7ce75dacf51:63b8931e70aee27",
          "Content-Type": "application/json"
        };


        let bodyContent = JSON.stringify({
          "order_id":"YCP-001"
        });


        let response = await
        fetch("https://app-t.pickndropnepal.com/api/method/logi360.api.get_order_details",
        { 
          method: "GET",
          body: bodyContent,
          headers: headersList
        });


        let data = await response.text();

        console.log(data);

        ```
      tags:
        - Get Order Status Information
      parameters:
        - name: order_id
          in: query
          description: ''
          required: true
          example: YGJ-020
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: token bf1a7ce75dacf51:63b8931e70aee27
          schema:
            type: string
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: object
                    properties:
                      status:
                        type: string
                      message:
                        type: string
                      data:
                        type: array
                        items:
                          type: object
                          properties:
                            order_name:
                              type: string
                            vendor_id:
                              type: string
                            pickup_branch:
                              type: string
                            reference_id:
                              type: string
                            status:
                              type: string
                            failed_attempt:
                              type: integer
                            customer_name:
                              type: string
                            primary_mobile_no:
                              type: string
                            secondary_mobile_no:
                              type: string
                            name_of_city_area:
                              type: string
                            location:
                              type: string
                            creation:
                              type: string
                            modified:
                              type: string
                            package_weight:
                              type: integer
                            weight_uom:
                              type: string
                            delivery_amount:
                              type: string
                            cod_amount:
                              type: string
                            order_type:
                              type: string
                            delivered_date:
                              type: string
                            received_date:
                              type: string
                            order_description:
                              type: string
                            instruction:
                              type: string
                            comments:
                              type: array
                              items:
                                type: object
                                properties:
                                  timestamp:
                                    type: string
                                  comment:
                                    type: string
                                  comment_by:
                                    type: string
                                required:
                                  - timestamp
                                  - comment
                                  - comment_by
                                x-apidog-orders:
                                  - timestamp
                                  - comment
                                  - comment_by
                            status_logs:
                              type: array
                              items:
                                type: object
                                properties:
                                  timestamp:
                                    type: string
                                  status:
                                    type: string
                                  log:
                                    type: string
                                x-apidog-orders:
                                  - timestamp
                                  - status
                                  - log
                            pickup_branch_details:
                              type: object
                              properties:
                                description:
                                  type: string
                                code:
                                  type: string
                              required:
                                - description
                                - code
                              x-apidog-orders:
                                - description
                                - code
                            destination_branch:
                              type: string
                            destination_branch_details:
                              type: object
                              properties:
                                description:
                                  type: string
                                code:
                                  type: string
                              required:
                                - description
                                - code
                              x-apidog-orders:
                                - description
                                - code
                          x-apidog-orders:
                            - order_name
                            - vendor_id
                            - pickup_branch
                            - reference_id
                            - status
                            - failed_attempt
                            - customer_name
                            - primary_mobile_no
                            - secondary_mobile_no
                            - name_of_city_area
                            - location
                            - creation
                            - modified
                            - package_weight
                            - weight_uom
                            - delivery_amount
                            - cod_amount
                            - order_type
                            - delivered_date
                            - received_date
                            - order_description
                            - instruction
                            - comments
                            - status_logs
                            - pickup_branch_details
                            - destination_branch
                            - destination_branch_details
                    required:
                      - status
                      - message
                      - data
                    x-apidog-orders:
                      - status
                      - message
                      - data
                required:
                  - data
                x-apidog-orders:
                  - data
              example:
                data:
                  status: success
                  message: Order details retrieved successfully.
                  data:
                    - order_name: YCP-001
                      vendor_id: Hmmm-EBV
                      pickup_branch: KATHMANDU VALLEY
                      reference_id: '123'
                      status: Open
                      failed_attempt: 0
                      customer_name: Vishal Pokhrel
                      primary_mobile_no: '8976211234'
                      secondary_mobile_no: ''
                      name_of_city_area: Lalitpur
                      location: Ktm
                      creation: '2025-03-16 13:59:48.684794'
                      modified: '2025-03-16 14:05:34.551164'
                      package_weight: 1
                      weight_uom: Kg
                      delivery_amount: '100'
                      cod_amount: '400.0'
                      order_type: Regular
                      delivered_date: ''
                      received_date: ''
                      order_description: ''
                      instruction: ''
                      comments:
                        - timestamp: '2025-03-19 15:34:13'
                          comment: YCP-001
                          comment_by: Pick & Drop Staff
                        - timestamp: '2025-03-16 14:00:33'
                          comment: hmm k xa
                          comment_by: Pick & Drop Staff
                      status_logs:
                        - timestamp: '2025-03-16 13:59:48.731005'
                          status: Open
                          log: Order created
                      pickup_branch_details:
                        description: KATHMANDU VALLEY, BHAKTAPUR, LALITPUR
                        code: KTM
                      destination_branch: KATHMANDU VALLEY
                      destination_branch_details:
                        description: KATHMANDU VALLEY, BHAKTAPUR, LALITPUR
                        code: KTM
          headers: {}
          x-apidog-name: OK
        '400':
          description: Error retrieving order details.
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: object
                    properties:
                      status:
                        type: string
                      message:
                        type: string
                      code:
                        type: string
                    required:
                      - status
                      - message
                      - code
                    x-apidog-orders:
                      - status
                      - message
                      - code
                  01K2Y6W36QPEJJXPDYH7S6RZQK:
                    type: string
                required:
                  - message
                  - 01K2Y6W36QPEJJXPDYH7S6RZQK
                x-apidog-orders:
                  - message
                  - 01K2Y6W36QPEJJXPDYH7S6RZQK
              example:
                message:
                  status: error
                  message: error_message
                  code: error_code
          headers: {}
          x-apidog-name: Bad Request
      security: []
      x-apidog-folder: Get Order Status Information
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1032358/apis/api-20060154-run
components:
  schemas: {}
  securitySchemes:
    ApiTokenAuth:
      type: apikey
      in: header
      name: Authorization
      description: 'Format: token <api_key>:<api_secret>'
servers:
  - url: https://app-t.pickndropnepal.com
    description: Test Environment
  - url: https://pickndropnepal.com
    description: Production Environment
security:
  - ApiTokenAuth: []
    x-apidog:
      schemeGroups:
        - id: 44qFUSysVW2GKLbPKOV1o
          schemeIds:
            - ApiTokenAuth
      required: true
      use:
        id: 44qFUSysVW2GKLbPKOV1o
      scopes:
        44qFUSysVW2GKLbPKOV1o:
          ApiTokenAuth: []

```
# Delivery Charge Calculator

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/method/logi360.api.get_delivery_rate:
    get:
      summary: Delivery Charge Calculator
      deprecated: false
      description: >
        # Delivery Charge Calculator API


        This API calculates delivery charges between branches based on package
        details.


        ## Base URLs

        - **Test:** `https://app-t.pickndropnepal.com`

        - **Production:** `https://pickndropnepal.com`


        ## Authentication

        Use API Token Authentication with the following header:


        `Authorization: token <api_key>:<api_secret>`


        Example:

        `Authorization: token bf1a7ce75dacf51:63b8931e70aee27`


        ## Endpoint

        ### GET `/api/method/logi360.api.get_delivery_rate`


        #### Description

        Retrieve delivery charges based on provided parameters.


        ### Headers

        - **Authorization (required):** `token <api_key>:<api_secret>`

        - **Accept:** `*/*`

        - **Content-Type:** `application/json`


        ## Request Body Fields


        | Field                 | Type     | Required |
        Description                                    | Example               |

        |-----------------------|----------|----------|------------------------------------------------|-----------------------|

        | **pickup_branch**      | string   | Yes      | The branch from where
        the package will be picked up. | `"KATHMANDU VALLEY"` |

        | **destination_branch** | string   | Yes      | The branch where the
        package will be delivered. | `"LALITPUR"`         |

        | **location**           | string   | Yes      | Specific location of
        the pickup.               | `"Balaju"`           |

        | **city_area**          | string   | Yes      | City or area where the
        pickup is located.     | `"Kathmandu"`        |

        | **package_width**      | integer  | Yes      | Width of the
        package.                          | `1`                  |

        | **package_height**     | integer  | Yes      | Height of the
        package.                         | `1`                  |

        | **package_length**     | integer  | Yes      | Length of the
        package.                         | `1`                  |

        | **package_weight**     | integer  | Yes      | Weight of the
        package.                         | `1`                  |

        | **size_uom**           | string   | Yes      | Unit of measurement for
        dimensions.           | `"cm"`               |

        | **weight_uom**         | string   | Yes      | Unit of measurement for
        weight.               | `"kg"`               |



        ### Example Request Body

        ```json

        {
          "pickup_branch": "KATHMANDU VALLEY",
          "destination_branch": "LALITPUR",
          "location": "Balaju",
          "city_area": "Kathmandu",
          "package_width": 1,
          "package_height": 1,
          "package_length": 1,
          "package_weight": 1,
          "size_uom": "cm",
          "weight_uom": "kg"
        }
      tags:
        - Delivery Charge Calculator
      parameters:
        - name: Authorization
          in: header
          description: ''
          required: false
          example: token bf1a7ce75dacf51:63b8931e70aee27
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                pickup_branch:
                  type: string
                destination_branch:
                  type: string
                location:
                  type: string
                city_area:
                  type: string
                package_width:
                  type: integer
                package_height:
                  type: integer
                package_length:
                  type: integer
                package_weight:
                  type: integer
                size_uom:
                  type: string
                weight_uom:
                  type: string
              required:
                - pickup_branch
                - destination_branch
                - location
                - city_area
                - package_width
                - package_height
                - package_length
                - package_weight
                - size_uom
                - weight_uom
              x-apidog-orders:
                - pickup_branch
                - destination_branch
                - location
                - city_area
                - package_width
                - package_height
                - package_length
                - package_weight
                - size_uom
                - weight_uom
            example:
              pickup_branch: KATHMANDU VALLEY
              destination_branch: LALITPUR
              location: Balaju
              city_area: Kathmandu
              package_width: 1
              package_height: 1
              package_length: 1
              package_weight: 1
              size_uom: cm
              weight_uom: kg
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: object
                    properties:
                      status:
                        type: string
                      message:
                        type: string
                      data:
                        type: object
                        properties:
                          delivery_amount:
                            type: integer
                        required:
                          - delivery_amount
                        x-apidog-orders:
                          - delivery_amount
                      surge_price:
                        type: integer
                      total_delivery_sum:
                        type: integer
                      result:
                        type: integer
                    required:
                      - status
                      - message
                      - data
                      - surge_price
                      - total_delivery_sum
                      - result
                    x-apidog-orders:
                      - status
                      - message
                      - data
                      - surge_price
                      - total_delivery_sum
                      - result
                required:
                  - message
                x-apidog-orders:
                  - message
              example:
                message:
                  status: success
                  message: Delivery rate retrieved successfully.
                  data:
                    delivery_amount: 100
                  surge_price: 0
                  total_delivery_sum: 100
                  result: 0
          headers: {}
          x-apidog-name: Success
      security: []
      x-apidog-folder: Delivery Charge Calculator
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1032358/apis/api-20525651-run
components:
  schemas: {}
  securitySchemes:
    ApiTokenAuth:
      type: apikey
      in: header
      name: Authorization
      description: 'Format: token <api_key>:<api_secret>'
servers:
  - url: https://app-t.pickndropnepal.com
    description: Test Environment
  - url: https://pickndropnepal.com
    description: Production Environment
security:
  - ApiTokenAuth: []
    x-apidog:
      schemeGroups:
        - id: 44qFUSysVW2GKLbPKOV1o
          schemeIds:
            - ApiTokenAuth
      required: true
      use:
        id: 44qFUSysVW2GKLbPKOV1o
      scopes:
        44qFUSysVW2GKLbPKOV1o:
          ApiTokenAuth: []

```

# Create / Update Webhook API URL

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /api/v2/create_webhook:
    post:
      summary: Create / Update Webhook API URL
      deprecated: false
      description: |+
        **Endpoint**  
        POST https://pickndropnepal.com/api/v2/create_webhook

      tags:
        - Webhook
      parameters: []
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                request_url:
                  type: string
                webhook_secret:
                  type: string
                enabled:
                  type: boolean
              required:
                - request_url
                - webhook_secret
                - enabled
              x-apidog-orders:
                - request_url
                - webhook_secret
                - enabled
            example:
              request_url: https://example.com/webhook/order-status
              webhook_secret: whsec_demo_123456
              enabled: true
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: object
                    properties:
                      status:
                        type: string
                      message:
                        type: string
                    required:
                      - status
                      - message
                    x-apidog-orders:
                      - status
                      - message
                required:
                  - data
                x-apidog-orders:
                  - data
              example:
                data:
                  status: success
                  message: Webhook created successfully
          headers: {}
          x-apidog-name: Success
      security: []
      x-apidog-folder: Webhook
      x-apidog-status: released
      x-run-in-apidog: https://app.apidog.com/web/project/1032358/apis/api-28101630-run
components:
  schemas: {}
  securitySchemes:
    ApiTokenAuth:
      type: apikey
      in: header
      name: Authorization
      description: 'Format: token <api_key>:<api_secret>'
servers:
  - url: https://app-t.pickndropnepal.com
    description: Test Environment
  - url: https://pickndropnepal.com
    description: Production Environment
security:
  - ApiTokenAuth: []
    x-apidog:
      schemeGroups:
        - id: 44qFUSysVW2GKLbPKOV1o
          schemeIds:
            - ApiTokenAuth
      required: true
      use:
        id: 44qFUSysVW2GKLbPKOV1o
      scopes:
        44qFUSysVW2GKLbPKOV1o:
          ApiTokenAuth: []

```
# Pick & Drop Webhook Integration 📡 

*1. Goto ***Integration*** > *Webhook Integration**

### Webhook Connect Process

![Screenshot 2025-08-18 at 13.11.46.png](https://api.apidog.com/api/v1/projects/1032358/resources/360065/image-preview)

*2. Set Webhook Url and Webhook Secrect*


![Screenshot 2026-01-01 at 18.30.02.png](https://api.apidog.com/api/v1/projects/1032358/resources/369212/image-preview)

*Note: Select any status or select All to get all status information*

### Payload on Webhook
```
{
 "comments": "Customer instruct to postpone",
 "epod": "https://pickndropnepal.com/files/794f9500-ca7f-496d-b114-da7d70c79d86_signature.png",
 "package_type": "Regular",
 "status": "package_reattempts_failed",
 "timestamp": "02-16-2026 14:19:53",
 "tracking_number": "PND-NP-000659692"
}

```


### Package Workflow Statuses List

| **Status** | **Explanation** |
|------------|-----------------|
| package_pickup_assigned | A rider has been assigned to pick up the package from the shipper. |
| package_pickup_1st_attempt_failed | The first attempt to pick up the package failed. |
| package_pickup_reattempt_failed | Multiple pickup attempts have failed. |
| package_pickup_success | The package has been successfully picked up from the shipper. |
| waiting_for_drop_off | The package is waiting to be dropped off at the last mile station. |
| package_arrived_at_hub | The package has arrived at the central hub. |
| package_received_at_hub | The package has been received and scanned at the hub. |
| received_at_lastmile_station | The package has reached the last mile station for delivery. |
| package_ready_to_dispatch_last_mile_station | The package is prepared to be dispatched from the last mile station. |
| package_dispatched_to_last_mile_station_transporter | The package has been dispatched to the last mile station via transporter. |
| package_stationed_in_from_transporter | The package has been stationed in after arrival from transporter. |
| ready_for_dispatched_last_mile_hero | The package is ready to be assigned to a delivery hero (rider). |
| out_for_delivery | The package is out with the rider for delivery to the customer. |
| about_to_deliver | The rider is close to the customer’s location and about to deliver. |
| 1st_attempt_failed | The first delivery attempt failed. |
| package_redelivery | The package has been scheduled for re-delivery. |
| package_reattempts_failed | Multiple delivery attempts have failed. |
| delivered | The package has been successfully delivered to the customer. |
| delivery_failed_and_cancelled | Delivery failed, and the package has been canceled. |
| return_at_transit_hub | The returned package has reached the transit hub. |
| package_returned_from_transit_hub_to_transporter | The returned package has been dispatched from the transit hub to the transporter. |
| received_from_transporter_to_dispatched_hub | The returned package has been received at the hub from the transporter. |
| fd_package_ready_to_return_to_shipper | The package is ready to be returned to the shipper. |
| package_returned | The package has been returned to the shipper. |
| package_returned_from_lastmile_sation_to_transporter | The package has been returned from the last mile station to the transporter. |
| cr_package_ready_to_delivered_to_qcc | The returned/failed package is ready to be delivered to the Quality Check Center (QCC). |



### Delivery Exception / Failure Reasons / Comments

- Customer already received same package  
- Customer not order  
- Customer cancel before Delivery  
- Customer checked and canceled the order  
- Customer instruct to postpone  
- Customer has no cash available  
- Package Damage  
- Wrong Product  
- Customer not reachable  
- Customer mobile switch Off  
- Phone Number does not exist  
- Always call forwarded  
- Customer number is hanging up after 2/3 ring  
- Customer does not pick call  
- Wrong Phone Number  
- Customer Out of home  
- Customer out of valley  
- Delivery Person Change  
- Customer Busy  
- Wrong Location  
- Customer change delivery location  
- Customer out of service area  
- Vehicle breakdown  
- Delivery Person had an accident at the time of delivery, so postponed for tomorrow. Sorry for Inconvenience.  
- Rider tried to deliver but couldn't be due to a busy schedule  
- The package cannot be delivered due to weather conditions  
- Fake order  
- COD Issue  
- Late Delivery Process  

*Note: There may be additional comments as well.*




