const mongoose = require('mongoose');
const { isValidObjectId } = require('mongoose');

const unitSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        enum: {
            values: ['cái', 'gói', 'bao', 'thùng', 'chai', 'lọ', 'hộp', 'kg', 'gram', 'liter', 'ml'],
            message: '{VALUE} is not a valid unit'
        }
    },
    ratio: { type: Number, required: true, min: 1 },
    salePrice: { type: Number, required: true, min: 0 }
}, { _id: false });

const supplierInfoSchema = new mongoose.Schema({
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Supplier",
        required: true,
        validate: {
            validator: (value) => isValidObjectId(value),
            message: "Invalid supplier ID"
        }
    },
    isPrimary: {
        type: Boolean,
        default: false,
    },
}, { _id: false });

const discountRuleSchema = new mongoose.Schema({
    daysBeforeExpiry: {
        type: Number,
        required: [true, 'Days before expiry is required'],
        min: [1, 'Days before expiry must be at least 1']
    },
    discountType: {
        type: String,
        required: [true, 'Discount type is required'],
        enum: {
            values: ["percentage", "fixed_amount"],
            message: "Discount type must be either 'percentage' or 'fixed_amount'"
        }
    },
    discountValue: {
        type: Number,
        required: [true, 'Discount value is required'],
        min: [0, 'Discount value cannot be negative'],
        validate: {
            validator: function (value) {
                if (this.discountType === "percentage") {
                    return value <= 100;
                }
                return value <= 1000000000;
            },
            message: function (props) {
                return props.reason.discountType === "percentage"
                    ? "Percentage discount cannot exceed 100%"
                    : "Fixed amount discount cannot exceed 1,000,000,000";
            }
        }
    }
});

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true,
            maxlength: [100, 'Product name cannot exceed 100 characters']
        },
        units: {
            type: [unitSchema],
            required: true,
            default: [
                { name: 'cái', ratio: 1, salePrice: 0 },
                { name: 'hộp', ratio: 10, salePrice: 0 }
            ],
            validate: {
                validator: function (units) {
                    const ratioSet = new Set();
                    let hasRatio1 = false;

                    for (const unit of units) {
                        if (ratioSet.has(unit.ratio)) return false;
                        ratioSet.add(unit.ratio);
                        if (unit.ratio === 1) hasRatio1 = true;
                    }

                    return hasRatio1;
                },
                message: "Units must have unique ratios and include one with ratio = 1"
            }
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: [true, 'Category is required'],
            validate: {
                validator: (value) => isValidObjectId(value),
                message: "Invalid category ID"
            }
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters']
        },
        SKU: {
            type: String,
            required: [true, 'SKU is required'],
            unique: true,
            uppercase: true,
            trim: true,
            maxlength: [50, 'SKU cannot exceed 50 characters']
        },
        barcode: {
            type: String,
            trim: true,
            unique: true,
            sparse: true,
            maxlength: [50, 'Barcode cannot exceed 50 characters']
        },
        minStockLevel: {
            type: Number,
            default: 0,
            min: 0,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer value'
            }
        },
        reorderLevel: {
            type: Number,
            min: 0,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer value'
            }
        },
        weight: {
            type: Number,
            min: 0
        },
        dimensions: {
            length: { type: Number, min: 0 },
            width: { type: Number, min: 0 },
            height: { type: Number, min: 0 }
        },
        expiryDiscountRules: {
            type: [discountRuleSchema],
            default: [
                { daysBeforeExpiry: 7, discountType: "percentage", discountValue: 30 },
                { daysBeforeExpiry: 14, discountType: "percentage", discountValue: 15 }
            ],
            validate: {
                validator: function (rules) {
                    if (!Array.isArray(rules)) return false;
                    const daysSet = new Set();
                    for (const rule of rules) {
                        if (daysSet.has(rule.daysBeforeExpiry)) {
                            return false; // Không cho phép trùng lặp daysBeforeExpiry
                        }
                        daysSet.add(rule.daysBeforeExpiry);
                    }
                    return true;
                },
                message: "Invalid discount rules format or duplicate daysBeforeExpiry"
            }
        },
        images: [{
            type: String,
            trim: true
        }],
        suppliers: {
            type: [supplierInfoSchema],
            validate: {
                validator: function (suppliers) {
                    const supplierIds = suppliers.map((s) => s.supplier.toString());
                    return new Set(supplierIds).size === supplierIds.length; // Ensure no duplicate suppliers
                },
                message: "Duplicate suppliers are not allowed",
            },
        },
        active: {
            type: Boolean,
            default: true,
        },
        tags: [{
            type: String,
            trim: true
        }],
        taxRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        discount: {
            type: {
                type: String,
                enum: ["percentage", "fixed_amount"]
            },
            value: {
                type: Number,
                min: 0
            },
            startDate: Date,
            endDate: Date,
            reason: String
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

productSchema.pre('save', function (next) {
    if (typeof this.expiryDiscountRules === 'string') {
        try {
            this.expiryDiscountRules = JSON.parse(this.expiryDiscountRules);
        } catch (error) {
            return next(new Error('Invalid expiryDiscountRules format'));
        }
    }

    if (typeof this.suppliers === 'string') {
        try {
            this.suppliers = JSON.parse(this.suppliers);
        } catch (error) {
            return next(new Error('Invalid suppliers format'));
        }
    }

    next();
});

productSchema.index({ name: 'text', description: 'text', SKU: 'text', barcode: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ active: 1 });
productSchema.index({ 'suppliers.supplier': 1 });

productSchema.virtual('primarySupplier').get(function () {
    if (this.suppliers && Array.isArray(this.suppliers)) {
        return this.suppliers.find(s => s.isPrimary) || this.suppliers[0];
    }
    return null;
});

productSchema.methods.getDiscountedPrice = function () {
    if (!this.discount || !salePrice) return salePrice;
    const now = new Date();
    if (now < this.discount.startDate || now > this.discount.endDate) {
        return salePrice;
    }

    return this.discount.type === "percentage"
        ? salePrice * (1 - this.discount.value / 100)
        : Math.max(0, salePrice - this.discount.value);
};

productSchema.pre('remove', async function (next) {
    const Batch = mongoose.model('Batch');
    await Batch.deleteMany({ product: this._id });
    next();
});

module.exports = mongoose.model("Product", productSchema);