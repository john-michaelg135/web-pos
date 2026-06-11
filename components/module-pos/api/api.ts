/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface ApproveOrderDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  approvedBy?: number | string;
}

export interface ApproveRefundDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  approvedBy?: number | string;
}

export interface ApproveStockAdjustmentDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  approvedBy?: number | string;
}

export interface CartItemDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  variationId?: number | string;
  /**
   * @format int32
   * @min 1
   * @max 10000
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  quantity?: number | string;
}

export interface ConfirmOrderDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  submittedBy?: number | string;
  printReceipt?: boolean;
}

export interface CreateEcommerceOrderDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  customerId?: null | number | string;
  contactPerson?: null | string;
  institutionalStreet?: null | string;
  institutionalCity?: null | string;
  institutionalProvince?: null | string;
  institutionalZipCode?: null | string;
  deliveryAddress?: null | string;
  orderType?: string;
  paymentMethod?: string;
  applyPwdDiscount?: boolean;
  voucherCode?: null | string;
  isPreorder?: boolean;
  customVariationNotes?: null | string;
  items?: CartItemDto[];
}

export interface CreateInstitutionalOrderDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  locationId?: null | number | string;
  deliveryAddress?: null | string;
  contactPerson?: null | string;
  customVariationNotes?: null | string;
  paymentMethod?: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  submittedBy?: null | number | string;
  items?: CartItemDto[];
}

export interface CreateLocationDto {
  locationName?: string;
  locationType?: string;
}

export interface CreateOrderDto {
  orderType?: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  locationId?: null | number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  submittedBy?: null | number | string;
  paymentMethod?: string;
  applyPwdDiscount?: boolean;
  /**
   * @minLength 5
   * @maxLength 15
   * @pattern ^[a-zA-Z0-9\-_]+$
   */
  voucherCode?: null | string;
  items?: CartItemDto[];
}

export interface CreateProductDto {
  /**
   * @minLength 0
   * @maxLength 30
   * @pattern ^[^<>]*$
   */
  productName: string;
  /** @pattern ^[^<>]*$ */
  productCategory: string;
  /**
   * @minLength 0
   * @maxLength 500
   * @pattern ^[^<>]*$
   */
  productDescription?: null | string;
  productImage?: null | string;
}

export interface CreateRefundRequestDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  orderId?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  variationId?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  locationId?: number | string;
  /**
   * @format int32
   * @min 1
   * @max 10000
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  quantityToReturn?: number | string;
  /**
   * @minLength 0
   * @maxLength 500
   * @pattern ^[^<>]*$
   */
  reason: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  requestedBy?: number | string;
}

export interface CreateStockAdjustmentDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  variationId?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  locationId?: number | string;
  adjustmentType?: string;
  /**
   * @format int32
   * @min 1
   * @max 10000
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  quantity?: number | string;
  /**
   * @minLength 0
   * @maxLength 500
   * @pattern ^[^<>]*$
   */
  reason: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  submittedBy?: number | string;
}

export interface CreateVariationDto {
  /**
   * @minLength 0
   * @maxLength 50
   * @pattern ^[a-zA-Z0-9\-_\|]+$
   */
  variationName: string;
  /**
   * @format double
   * @min 0.01
   * @max 1000000
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  initialPrice?: number | string;
}

export interface CreateVoucherDto {
  /**
   * @minLength 5
   * @maxLength 15
   * @pattern ^[a-zA-Z0-9\-_]+$
   */
  voucherCode: string;
  discountType?: string;
  /**
   * @format double
   * @min 0
   * @max 1000000
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  discountValue?: number | string;
  /**
   * @format double
   * @min 0
   * @max 1000000
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  minimumSpend?: number | string;
  /** @format date-time */
  expiryDate?: string;
}

export interface CrmsCartDto {
  customerId?: string;
  items?: CrmsCartItemDto[];
  pricing?: CrmsCartPricingDto;
  /** @format date-time */
  updatedAt?: string;
}

export interface CrmsCartItemDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  productId?: number | string;
  productName?: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  quantity?: number | string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  unitPrice?: number | string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  totalPrice?: number | string;
}

export interface CrmsCartPricingDto {
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  subtotalAmount?: number | string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  discountAmount?: number | string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  totalAmount?: number | string;
}

export interface CrmsCustomerOrdersResponseDto {
  items?: CrmsOrderSummaryDto[];
}

export interface CrmsOrderDetailDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  orderId?: number | string;
  customerId?: null | string;
  orderStatus?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  items?: CrmsOrderItemDto[];
  pricing?: CrmsOrderPricingDto;
  deliveryAddress?: null | string;
  /** @format date-time */
  orderedAt?: string;
  /** @format date-time */
  deliveredAt?: null | string;
}

export interface CrmsOrderItemDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  productId?: number | string;
  productName?: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  quantity?: number | string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  price?: number | string;
}

export interface CrmsOrderPricingDto {
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  subtotalAmount?: number | string;
  voucherCode?: null | string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  voucherDiscountAmount?: null | number | string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  totalAmount?: number | string;
}

export interface CrmsOrderSummaryDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  orderId?: number | string;
  orderStatus?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  product?: CrmsProductRefDto;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  quantity?: number | string;
  pricing?: CrmsOrderPricingDto;
  deliveryAddress?: null | string;
  /** @format date-time */
  orderedAt?: string;
  /** @format date-time */
  deliveredAt?: null | string;
}

export interface CrmsProductRefDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  productId?: number | string;
  productName?: string;
}

export interface LocationResponseDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  locationId?: number | string;
  locationName?: string;
  locationType?: string;
  isActive?: boolean;
  /** @format date-time */
  createdAt?: string;
}

export interface LowStockAlertDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  stockId?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  variationId?: number | string;
  variationName?: string;
  productName?: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  locationId?: number | string;
  locationName?: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  quantity?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  minThreshold?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  deficit?: number | string;
}

export interface OrderItemResponseDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  itemId?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  variationId?: number | string;
  productName?: string;
  variationName?: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  quantity?: number | string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  unitPrice?: number | string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  subtotal?: number | string;
}

export interface OrderManagementResponseDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  orderId?: number | string;
  orderNumber?: string;
  orderType?: string;
  orderSource?: string;
  orderStatus?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  totalAmount?: number | string;
  appliedVoucherCode?: null | string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  voucherDiscountAmount?: null | number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  customerId?: null | number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  locationId?: null | number | string;
  locationName?: null | string;
  deliveryAddress?: null | string;
  institutionalStreet?: null | string;
  institutionalCity?: null | string;
  institutionalProvince?: null | string;
  institutionalZipCode?: null | string;
  contactPerson?: null | string;
  isPreorder?: boolean;
  customVariationNotes?: null | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  submittedBy?: null | number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  approvedBy?: null | number | string;
  /** @format date-time */
  approvedAt?: null | string;
  rejectionRemarks?: null | string;
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  updatedAt?: string;
  payments?: PaymentResponseDto[];
  items?: OrderItemResponseDto[];
}

export interface OrderResponseDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  orderId?: number | string;
  orderNumber?: string;
  orderType?: string;
  orderSource?: string;
  locationName?: null | string;
  locationId?: null | number | string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  totalAmount?: number | string;
  appliedVoucherCode?: null | string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  voucherDiscountAmount?: null | number | string;
  orderStatus?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  /** @format date-time */
  createdAt?: string;
  items?: OrderItemResponseDto[];
  payments?: PaymentResponseDto[];
}

export interface OrderTrackingDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  orderId?: number | string;
  orderNumber?: string;
  orderSource?: string;
  orderType?: string;
  orderStatus?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  isPreorder?: boolean;
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  updatedAt?: string;
  /** @format date-time */
  approvedAt?: null | string;
  progressStep?: null | string;
}

export interface PaymentResponseDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  paymentId?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  orderId?: number | string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  amountPaid?: number | string;
  paymentChannel?: string;
  gatewayReferenceNumber?: null | string;
  paymentStatus?: string;
  /** @format date-time */
  paidAt?: string;
}

export interface PriceHistoryResponseDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  historyId?: number | string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  price?: number | string;
  /** @format date-time */
  effectiveFrom?: string;
  /** @format date-time */
  effectiveTo?: null | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  setBy?: null | number | string;
  /** @format date-time */
  createdAt?: string;
}

export interface ProblemDetails {
  type?: null | string;
  title?: null | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  status?: null | number | string;
  detail?: null | string;
  instance?: null | string;
}

export interface ProductGridItemDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  productId?: number | string;
  productName?: string;
  productImage?: null | string;
  productCategory?: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  variationId?: number | string;
  variationName?: string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  price?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  stockQuantity?: null | number | string;
  isInStock?: boolean;
}

export interface ProductResponseDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  productId?: number | string;
  productName?: string;
  productCategory?: string;
  productDescription?: null | string;
  productImage?: null | string;
  isActive?: boolean;
  variations?: VariationResponseDto[];
}

export interface RefundResponseDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  refundRequestId?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  orderId?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  variationId?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  locationId?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  quantityToReturn?: number | string;
  reason?: string;
  status?: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  requestedBy?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  approvedBy?: null | number | string;
  /** @format date-time */
  approvedAt?: null | string;
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  updatedAt?: string;
}

export interface RejectOrderDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  rejectedBy?: number | string;
  rejectionRemarks?: string;
}

export interface RequestRefundDto {
  reason?: string;
}

export interface RevenueSummaryDto {
  period?: string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  totalRevenue?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalOrders?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalUnitsSold?: number | string;
}

export interface SalesBreakdownDto {
  label?: string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  totalRevenue?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalOrders?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalUnitsSold?: number | string;
}

export interface ScmsPullSummaryDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalDeliveriesReceived?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalItemsUpdated?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  totalErrors?: number | string;
  errors?: string[];
  /** @format date-time */
  pulledAt?: string;
}

export interface SetPriceDto {
  /**
   * @format double
   * @min 0.01
   * @max 1000000
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  price?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  setBy?: null | number | string;
}

export interface StockAdjustmentRequestDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  variationId?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  locationId?: number | string;
  /**
   * @format int32
   * @min -10000
   * @max 10000
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  quantity?: number | string;
  adjustmentType?: string;
  /**
   * @minLength 0
   * @maxLength 500
   * @pattern ^[^<>]*$
   */
  reason: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  submittedBy?: number | string;
}

export interface StockAdjustmentResponseDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  adjustmentId?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  variationId?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  locationId?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  quantity?: number | string;
  adjustmentType?: string;
  reason?: string;
  status?: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  submittedBy?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  approvedBy?: null | number | string;
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  updatedAt?: string;
}

export interface StockReceivingDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  variationId?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  locationId?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  quantityReceived?: number | string;
  notes?: null | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  receivedBy?: null | number | string;
}

export interface StockResponseDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  stockId?: number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  variationId?: number | string;
  variationName?: string;
  productName?: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  locationId?: number | string;
  locationName?: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  quantity?: number | string;
  /** @format date-time */
  updatedAt?: string;
}

export interface UpdateLocationDto {
  locationName?: null | string;
  locationType?: null | string;
  isActive?: null | boolean;
}

export interface UpdateProductDto {
  /**
   * @minLength 0
   * @maxLength 30
   * @pattern ^[^<>]*$
   */
  productName?: null | string;
  /** @pattern ^[^<>]*$ */
  productCategory?: null | string;
  /**
   * @minLength 0
   * @maxLength 500
   * @pattern ^[^<>]*$
   */
  productDescription?: null | string;
  productImage?: null | string;
  isActive?: null | boolean;
}

export interface UpdateVariationDto {
  /**
   * @minLength 0
   * @maxLength 50
   * @pattern ^[a-zA-Z0-9\-_\|]+$
   */
  variationName?: null | string;
  isActive?: null | boolean;
}

export interface UpdateVoucherDto {
  isActive?: null | boolean;
  /** @format date-time */
  expiryDate?: null | string;
  /**
   * @format double
   * @min 0
   * @max 1000000
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  minimumSpend?: null | number | string;
}

export interface StockReceivingResponseDto {
  receivingId?: number;
  variationId?: number;
  variationName?: string;
  productName?: string;
  locationId?: number;
  locationName?: string;
  quantityReceived?: number;
  notes?: null | string;
  receivedBy?: null | number;
  /** @format date-time */
  receivedAt?: string;
}

export interface VariationResponseDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  variationId?: number | string;
  variationName?: string;
  isActive?: boolean;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  currentPrice?: null | number | string;
}

export interface VoucherResponseDto {
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  voucherId?: number | string;
  voucherCode?: string;
  discountType?: string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  discountValue?: number | string;
  /**
   * @format double
   * @pattern ^-?(?:0|[1-9]\d*)(?:\.\d+)?$
   */
  minimumSpend?: number | string;
  isActive?: boolean;
  /** @format date-time */
  expiryDate?: string;
  /** @format date-time */
  createdAt?: string;
}

import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  HeadersDefaults,
  ResponseType,
} from "axios";
import axios from "axios";

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams
  extends Omit<AxiosRequestConfig, "data" | "params" | "url" | "responseType"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown>
  extends Omit<AxiosRequestConfig, "data" | "cancelToken"> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private secure?: boolean;
  private format?: ResponseType;

  constructor({
    securityWorker,
    secure,
    format,
    ...axiosConfig
  }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({
      ...axiosConfig,
      baseURL: axiosConfig.baseURL || "http://localhost:5001/api/pos",
    });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(
    params1: AxiosRequestConfig,
    params2?: AxiosRequestConfig,
  ): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method &&
          this.instance.defaults.headers[
            method.toLowerCase() as keyof HeadersDefaults
          ]) ||
          {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === "object" && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    if (input instanceof FormData) {
      return input;
    }
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: any[] =
        property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(
          key,
          isFileType ? formItem : this.stringifyFormItem(formItem),
        );
      }

      return formData;
    }, new FormData());
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<AxiosResponse<T>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (
      type === ContentType.FormData &&
      body &&
      body !== null &&
      typeof body === "object"
    ) {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (
      type === ContentType.Text &&
      body &&
      body !== null &&
      typeof body !== "string"
    ) {
      body = JSON.stringify(body);
    }

    return this.instance.request({
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type ? { "Content-Type": type } : {}),
      },
      params: query,
      responseType: responseFormat,
      data: body,
      url: path,
    });
  };
}

/**
 * @title api-pos | v1
 * @version 1.0.0
 * @baseUrl http://localhost:8083/
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  apiPos = {
    /**
     * No description
     *
     * @tags Analytics
     * @name AnalyticsRevenueList
     * @request GET:/api-pos/analytics/revenue
     */
    analyticsRevenueList: (
      query?: {
        /** @format date-time */
        DateFrom?: string;
        /** @format date-time */
        DateTo?: string;
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        LocationId?: number | string;
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        VariationId?: number | string;
        OrderType?: string;
        OrderSource?: string;
        GroupBy?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<RevenueSummaryDto[], any>({
        path: `/api-pos/analytics/revenue`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Analytics
     * @name AnalyticsSalesByLocationList
     * @request GET:/api-pos/analytics/sales/by-location
     */
    analyticsSalesByLocationList: (
      query?: {
        /** @format date-time */
        DateFrom?: string;
        /** @format date-time */
        DateTo?: string;
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        LocationId?: number | string;
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        VariationId?: number | string;
        OrderType?: string;
        OrderSource?: string;
        GroupBy?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<SalesBreakdownDto[], any>({
        path: `/api-pos/analytics/sales/by-location`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Analytics
     * @name AnalyticsSalesByVariationList
     * @request GET:/api-pos/analytics/sales/by-variation
     */
    analyticsSalesByVariationList: (
      query?: {
        /** @format date-time */
        DateFrom?: string;
        /** @format date-time */
        DateTo?: string;
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        LocationId?: number | string;
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        VariationId?: number | string;
        OrderType?: string;
        OrderSource?: string;
        GroupBy?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<SalesBreakdownDto[], any>({
        path: `/api-pos/analytics/sales/by-variation`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Analytics
     * @name AnalyticsSalesByChannelList
     * @request GET:/api-pos/analytics/sales/by-channel
     */
    analyticsSalesByChannelList: (
      query?: {
        /** @format date-time */
        DateFrom?: string;
        /** @format date-time */
        DateTo?: string;
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        LocationId?: number | string;
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        VariationId?: number | string;
        OrderType?: string;
        OrderSource?: string;
        GroupBy?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<SalesBreakdownDto[], any>({
        path: `/api-pos/analytics/sales/by-channel`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags CrmsQuery
     * @name CustomersOrdersList
     * @request GET:/api-pos/customers/{customerId}/orders
     */
    customersOrdersList: (
      customerId: string,
      query?: {
        OrderStatus?: string;
        PaymentStatus?: string;
        PaymentMethod?: string;
        /** @format date-time */
        OrderedFrom?: string;
        /** @format date-time */
        OrderedTo?: string;
        /** @format date-time */
        DeliveredFrom?: string;
        /** @format date-time */
        DeliveredTo?: string;
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        OrderId?: number | string;
        VoucherCode?: string;
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        ProductId?: number | string;
        SortBy?: string;
        SortOrder?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<CrmsCustomerOrdersResponseDto, any>({
        path: `/api-pos/customers/${customerId}/orders`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags CrmsQuery
     * @name OrdersDetail
     * @request GET:/api-pos/orders/{orderId}
     */
    ordersDetail: (orderId: number, params: RequestParams = {}) =>
      this.request<CrmsOrderDetailDto, ProblemDetails>({
        path: `/api-pos/orders/${orderId}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags CrmsQuery
     * @name CustomersCartList
     * @request GET:/api-pos/customers/{customerId}/cart
     */
    customersCartList: (customerId: string, params: RequestParams = {}) =>
      this.request<CrmsCartDto, ProblemDetails>({
        path: `/api-pos/customers/${customerId}/cart`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Inventory
     * @name InventoryStockReceivingCreate
     * @request POST:/api-pos/inventory/stock-receiving
     */
    inventoryStockReceivingCreate: (
      data: StockReceivingDto,
      params: RequestParams = {},
    ) =>
      this.request<StockResponseDto, ProblemDetails>({
        path: `/api-pos/inventory/stock-receiving`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Inventory
     * @name InventoryStockReceivingList
     * @request GET:/api-pos/inventory/stock-receiving
     */
    inventoryStockReceivingList: (params: RequestParams = {}) =>
      this.request<StockReceivingResponseDto[], ProblemDetails>({
        path: `/api-pos/inventory/stock-receiving`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Inventory
     * @name InventoryStockList
     * @request GET:/api-pos/inventory/stock
     */
    inventoryStockList: (
      query?: {
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        locationId?: number | string;
      },
      params: RequestParams = {},
    ) =>
      this.request<StockResponseDto[], ProblemDetails>({
        path: `/api-pos/inventory/stock`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Inventory
     * @name InventoryStockAllList
     * @request GET:/api-pos/inventory/stock/all
     */
    inventoryStockAllList: (params: RequestParams = {}) =>
      this.request<StockResponseDto[], any>({
        path: `/api-pos/inventory/stock/all`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Inventory
     * @name InventoryLowStockList
     * @request GET:/api-pos/inventory/low-stock
     */
    inventoryLowStockList: (params: RequestParams = {}) =>
      this.request<LowStockAlertDto[], any>({
        path: `/api-pos/inventory/low-stock`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags StockAdjustment
     * @name InventoryAdjustmentsCreate
     * @request POST:/api-pos/inventory/adjustments
     */
    inventoryAdjustmentsCreate: (
      data: CreateStockAdjustmentDto,
      params: RequestParams = {},
    ) =>
      this.request<StockAdjustmentResponseDto, ProblemDetails>({
        path: `/api-pos/inventory/adjustments`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags StockAdjustment
     * @name InventoryAdjustmentsList
     * @request GET:/api-pos/inventory/adjustments
     */
    inventoryAdjustmentsList: (params: RequestParams = {}) =>
      this.request<StockAdjustmentResponseDto[], any>({
        path: `/api-pos/inventory/adjustments`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Inventory
     * @name InventoryAdjustmentsApproveUpdate
     * @request PUT:/api-pos/inventory/adjustments/{adjustmentId}/approve
     */
    inventoryAdjustmentsApproveUpdate: (
      adjustmentId: number,
      query?: {
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        approvedBy?: number | string;
      },
      params: RequestParams = {},
    ) =>
      this.request<StockAdjustmentResponseDto, ProblemDetails>({
        path: `/api-pos/inventory/adjustments/${adjustmentId}/approve`,
        method: "PUT",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Location
     * @name LocationsList
     * @request GET:/api-pos/locations
     */
    locationsList: (params: RequestParams = {}) =>
      this.request<LocationResponseDto[], any>({
        path: `/api-pos/locations`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Location
     * @name LocationsCreate
     * @request POST:/api-pos/locations
     */
    locationsCreate: (data: CreateLocationDto, params: RequestParams = {}) =>
      this.request<LocationResponseDto, ProblemDetails>({
        path: `/api-pos/locations`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Location
     * @name LocationsUpdate
     * @request PUT:/api-pos/locations/{locationId}
     */
    locationsUpdate: (
      locationId: number,
      data: UpdateLocationDto,
      params: RequestParams = {},
    ) =>
      this.request<LocationResponseDto, ProblemDetails>({
        path: `/api-pos/locations/${locationId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrderEntry
     * @name OrderEntryProductGridList
     * @request GET:/api-pos/order-entry/product-grid
     */
    orderEntryProductGridList: (
      query?: {
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        locationId?: number | string;
      },
      params: RequestParams = {},
    ) =>
      this.request<ProductGridItemDto[], any>({
        path: `/api-pos/order-entry/product-grid`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrderEntry
     * @name OrderEntryOrdersCreate
     * @request POST:/api-pos/order-entry/orders
     */
    orderEntryOrdersCreate: (
      data: CreateOrderDto,
      params: RequestParams = {},
    ) =>
      this.request<OrderResponseDto, ProblemDetails>({
        path: `/api-pos/order-entry/orders`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrderEntry
     * @name OrderEntryOrdersList
     * @request GET:/api-pos/order-entry/orders
     */
    orderEntryOrdersList: (params: RequestParams = {}) =>
      this.request<OrderResponseDto[], any>({
        path: `/api-pos/order-entry/orders`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrderEntry
     * @name OrderEntryOrdersConfirmUpdate
     * @request PUT:/api-pos/order-entry/orders/{orderId}/confirm
     */
    orderEntryOrdersConfirmUpdate: (
      orderId: number,
      data: ConfirmOrderDto,
      params: RequestParams = {},
    ) =>
      this.request<OrderResponseDto, ProblemDetails>({
        path: `/api-pos/order-entry/orders/${orderId}/confirm`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrderEntry
     * @name OrderEntryOrdersInstitutionalCreate
     * @request POST:/api-pos/order-entry/orders/institutional
     */
    orderEntryOrdersInstitutionalCreate: (
      data: CreateInstitutionalOrderDto,
      params: RequestParams = {},
    ) =>
      this.request<OrderResponseDto, ProblemDetails>({
        path: `/api-pos/order-entry/orders/institutional`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrderEntry
     * @name OrderEntryOrdersEcommerceCreate
     * @request POST:/api-pos/order-entry/orders/ecommerce
     */
    orderEntryOrdersEcommerceCreate: (
      data: CreateEcommerceOrderDto,
      params: RequestParams = {},
    ) =>
      this.request<OrderResponseDto, ProblemDetails>({
        path: `/api-pos/order-entry/orders/ecommerce`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrderEntry
     * @name OrderEntryOrdersPreorderUpdate
     * @request PUT:/api-pos/order-entry/orders/{orderId}/preorder
     */
    orderEntryOrdersPreorderUpdate: (
      orderId: number,
      query?: {
        /** @default true */
        isPreorder?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<OrderResponseDto, ProblemDetails>({
        path: `/api-pos/order-entry/orders/${orderId}/preorder`,
        method: "PUT",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrderEntry
     * @name OrderEntryOrdersDetail
     * @request GET:/api-pos/order-entry/orders/{orderId}
     */
    orderEntryOrdersDetail: (orderId: number, params: RequestParams = {}) =>
      this.request<OrderResponseDto, ProblemDetails>({
        path: `/api-pos/order-entry/orders/${orderId}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrderManagement
     * @name OrderManagementPendingApprovalList
     * @request GET:/api-pos/order-management/pending-approval
     */
    orderManagementPendingApprovalList: (params: RequestParams = {}) =>
      this.request<OrderManagementResponseDto[], any>({
        path: `/api-pos/order-management/pending-approval`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrderManagement
     * @name OrderManagementOrdersApproveUpdate
     * @request PUT:/api-pos/order-management/orders/{orderId}/approve
     */
    orderManagementOrdersApproveUpdate: (
      orderId: number,
      data: ApproveOrderDto,
      params: RequestParams = {},
    ) =>
      this.request<OrderManagementResponseDto, ProblemDetails>({
        path: `/api-pos/order-management/orders/${orderId}/approve`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrderManagement
     * @name OrderManagementOrdersRejectUpdate
     * @request PUT:/api-pos/order-management/orders/{orderId}/reject
     */
    orderManagementOrdersRejectUpdate: (
      orderId: number,
      data: RejectOrderDto,
      params: RequestParams = {},
    ) =>
      this.request<OrderManagementResponseDto, ProblemDetails>({
        path: `/api-pos/order-management/orders/${orderId}/reject`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrderManagement
     * @name OrderManagementOrdersList
     * @request GET:/api-pos/order-management/orders
     */
    orderManagementOrdersList: (
      query?: {
        OrderStatus?: string;
        OrderSource?: string;
        OrderType?: string;
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        LocationId?: number | string;
        /** @format date-time */
        DateFrom?: string;
        /** @format date-time */
        DateTo?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<OrderManagementResponseDto[], any>({
        path: `/api-pos/order-management/orders`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrderManagement
     * @name OrderManagementOrdersConfirmDeliveryUpdate
     * @request PUT:/api-pos/order-management/orders/{orderId}/confirm-delivery
     */
    orderManagementOrdersConfirmDeliveryUpdate: (
      orderId: number,
      query?: {
        /**
         * @format int32
         * @pattern ^-?(?:0|[1-9]\d*)$
         */
        confirmedBy?: number | string;
      },
      params: RequestParams = {},
    ) =>
      this.request<OrderManagementResponseDto, ProblemDetails>({
        path: `/api-pos/order-management/orders/${orderId}/confirm-delivery`,
        method: "PUT",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrderManagement
     * @name OrderManagementOrdersTrackingList
     * @request GET:/api-pos/order-management/orders/{orderId}/tracking
     */
    orderManagementOrdersTrackingList: (
      orderId: number,
      params: RequestParams = {},
    ) =>
      this.request<OrderTrackingDto, ProblemDetails>({
        path: `/api-pos/order-management/orders/${orderId}/tracking`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrderManagement
     * @name OrderManagementOrdersRequestRefundUpdate
     * @request PUT:/api-pos/order-management/orders/{orderId}/request-refund
     */
    orderManagementOrdersRequestRefundUpdate: (
      orderId: number,
      data: RequestRefundDto,
      params: RequestParams = {},
    ) =>
      this.request<OrderManagementResponseDto, ProblemDetails>({
        path: `/api-pos/order-management/orders/${orderId}/request-refund`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrderManagement
     * @name OrderManagementOrdersApproveRefundUpdate
     * @request PUT:/api-pos/order-management/orders/{orderId}/approve-refund
     */
    orderManagementOrdersApproveRefundUpdate: (
      orderId: number,
      data: ApproveOrderDto,
      params: RequestParams = {},
    ) =>
      this.request<OrderManagementResponseDto, ProblemDetails>({
        path: `/api-pos/order-management/orders/${orderId}/approve-refund`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags OrderManagement
     * @name OrderManagementOrdersRejectRefundUpdate
     * @request PUT:/api-pos/order-management/orders/{orderId}/reject-refund
     */
    orderManagementOrdersRejectRefundUpdate: (
      orderId: number,
      data: RejectOrderDto,
      params: RequestParams = {},
    ) =>
      this.request<OrderManagementResponseDto, ProblemDetails>({
        path: `/api-pos/order-management/orders/${orderId}/reject-refund`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ProductCatalog
     * @name ProductCatalogProductsList
     * @request GET:/api-pos/product-catalog/products
     */
    productCatalogProductsList: (params: RequestParams = {}) =>
      this.request<ProductResponseDto[], void>({
        path: `/api-pos/product-catalog/products`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ProductCatalog
     * @name ProductCatalogProductsCreate
     * @request POST:/api-pos/product-catalog/products
     */
    productCatalogProductsCreate: (
      data: CreateProductDto,
      params: RequestParams = {},
    ) =>
      this.request<ProductResponseDto, ProblemDetails>({
        path: `/api-pos/product-catalog/products`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ProductCatalog
     * @name ProductCatalogProductsDetail
     * @request GET:/api-pos/product-catalog/products/{productId}
     */
    productCatalogProductsDetail: (
      productId: number,
      params: RequestParams = {},
    ) =>
      this.request<ProductResponseDto, ProblemDetails>({
        path: `/api-pos/product-catalog/products/${productId}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ProductCatalog
     * @name ProductCatalogProductsUpdate
     * @request PUT:/api-pos/product-catalog/products/{productId}
     */
    productCatalogProductsUpdate: (
      productId: number,
      data: UpdateProductDto,
      params: RequestParams = {},
    ) =>
      this.request<ProductResponseDto, ProblemDetails>({
        path: `/api-pos/product-catalog/products/${productId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ProductCatalog
     * @name ProductCatalogProductsVariationsCreate
     * @request POST:/api-pos/product-catalog/products/{productId}/variations
     */
    productCatalogProductsVariationsCreate: (
      productId: number,
      data: CreateVariationDto,
      params: RequestParams = {},
    ) =>
      this.request<VariationResponseDto, ProblemDetails>({
        path: `/api-pos/product-catalog/products/${productId}/variations`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ProductCatalog
     * @name ProductCatalogVariationsUpdate
     * @request PUT:/api-pos/product-catalog/variations/{variationId}
     */
    productCatalogVariationsUpdate: (
      variationId: number,
      data: UpdateVariationDto,
      params: RequestParams = {},
    ) =>
      this.request<VariationResponseDto, ProblemDetails>({
        path: `/api-pos/product-catalog/variations/${variationId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ProductCatalog
     * @name ProductCatalogVariationsPriceUpdate
     * @request PUT:/api-pos/product-catalog/variations/{variationId}/price
     */
    productCatalogVariationsPriceUpdate: (
      variationId: number,
      data: SetPriceDto,
      params: RequestParams = {},
    ) =>
      this.request<VariationResponseDto, ProblemDetails>({
        path: `/api-pos/product-catalog/variations/${variationId}/price`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ProductCatalog
     * @name ProductCatalogVariationsPriceHistoryList
     * @request GET:/api-pos/product-catalog/variations/{variationId}/price-history
     */
    productCatalogVariationsPriceHistoryList: (
      variationId: number,
      params: RequestParams = {},
    ) =>
      this.request<PriceHistoryResponseDto[], any>({
        path: `/api-pos/product-catalog/variations/${variationId}/price-history`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Refund
     * @name RefundsCreate
     * @request POST:/api-pos/refunds
     */
    refundsCreate: (data: CreateRefundRequestDto, params: RequestParams = {}) =>
      this.request<RefundResponseDto, ProblemDetails>({
        path: `/api-pos/refunds`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Refund
     * @name RefundsList
     * @request GET:/api-pos/refunds
     */
    refundsList: (params: RequestParams = {}) =>
      this.request<RefundResponseDto[], any>({
        path: `/api-pos/refunds`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Refund
     * @name RefundsApproveUpdate
     * @request PUT:/api-pos/refunds/{id}/approve
     */
    refundsApproveUpdate: (
      id: number,
      data: ApproveRefundDto,
      params: RequestParams = {},
    ) =>
      this.request<RefundResponseDto, ProblemDetails>({
        path: `/api-pos/refunds/${id}/approve`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags ScmsIntegration
     * @name ScmsPullDeliveriesCreate
     * @request POST:/api-pos/scms/pull-deliveries
     */
    scmsPullDeliveriesCreate: (params: RequestParams = {}) =>
      this.request<ScmsPullSummaryDto, void>({
        path: `/api-pos/scms/pull-deliveries`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags StockAdjustment
     * @name InventoryAdjustmentsApproveUpdate2
     * @request PUT:/api-pos/inventory/adjustments/{id}/approve
     * @originalName inventoryAdjustmentsApproveUpdate
     * @duplicate
     */
    inventoryAdjustmentsApproveUpdate2: (
      id: number,
      data: ApproveStockAdjustmentDto,
      params: RequestParams = {},
    ) =>
      this.request<StockAdjustmentResponseDto, ProblemDetails>({
        path: `/api-pos/inventory/adjustments/${id}/approve`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  api = {
    /**
     * No description
     *
     * @tags Voucher
     * @name VoucherCreate
     * @request POST:/api/Voucher
     */
    voucherCreate: (data: CreateVoucherDto, params: RequestParams = {}) =>
      this.request<VoucherResponseDto, any>({
        path: `/api/Voucher`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Voucher
     * @name VoucherList
     * @request GET:/api/Voucher
     */
    voucherList: (
      query?: {
        /** @default false */
        includeInactive?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<VoucherResponseDto[], any>({
        path: `/api/Voucher`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Voucher
     * @name VoucherDetail
     * @request GET:/api/Voucher/{id}
     */
    voucherDetail: (id: number, params: RequestParams = {}) =>
      this.request<VoucherResponseDto, any>({
        path: `/api/Voucher/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Voucher
     * @name VoucherPartialUpdate
     * @request PATCH:/api/Voucher/{id}
     */
    voucherPartialUpdate: (
      id: number,
      data: UpdateVoucherDto,
      params: RequestParams = {},
    ) =>
      this.request<VoucherResponseDto, any>({
        path: `/api/Voucher/${id}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Voucher
     * @name VoucherDelete
     * @request DELETE:/api/Voucher/{id}
     */
    voucherDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/Voucher/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Voucher
     * @name VoucherCodeDetail
     * @request GET:/api/Voucher/code/{code}
     */
    voucherCodeDetail: (code: string, params: RequestParams = {}) =>
      this.request<VoucherResponseDto, any>({
        path: `/api/Voucher/code/${code}`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
}
