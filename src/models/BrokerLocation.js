const mongoose = require("mongoose");

const brokerLocationSchema = new mongoose.Schema(
  {
    brokerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Broker",
      required: true,
      index: true,
    },

    brokerName: {
      type: String,
      required: true,
      trim: true,
    },

    branchName: {
      type: String,
      default: "Main Branch",
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    pincode: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    /**
     * ✅ GeoJSON Point (BEST for Near-Me queries)
     * Mongo expects: [longitude, latitude]
     */
    geo: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0],
      },
    },

    /**
     * ✅ Keep your old structure too (optional)
     * So your existing UI doesn't break.
     */
    coordinates: {
      latitude: {
        type: Number,
        default: 0,
      },
      longitude: {
        type: Number,
        default: 0,
      },
    },

    isHeadOffice: {
      type: Boolean,
      default: false,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true, // ✅ automatically manages createdAt + updatedAt
  }
);

/**
 * ✅ 2dsphere index for $near / geoWithin
 */
brokerLocationSchema.index({ geo: "2dsphere" });

/**
 * ✅ common filtering indexes
 */
brokerLocationSchema.index({ city: 1, state: 1 });
brokerLocationSchema.index({ brokerId: 1, city: 1, state: 1 });

/**
 * ✅ Keep geo + coordinates always synced
 */
brokerLocationSchema.pre("save", function (next) {
  const lat = Number(this.coordinates?.latitude || 0);
  const lng = Number(this.coordinates?.longitude || 0);

  // if UI stored in coordinates, reflect into geo
  if (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng)
  ) {
    this.geo = {
      type: "Point",
      coordinates: [lng, lat], // IMPORTANT: [lng, lat]
    };
  }

  next();
});

/**
 * ✅ When updating by findOneAndUpdate, sync geo also
 */
brokerLocationSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};

  const coords =
    update.coordinates ||
    update.$set?.coordinates ||
    update.$set?.["coordinates"];

  if (coords) {
    const lat = Number(coords.latitude || 0);
    const lng = Number(coords.longitude || 0);

    const geoPoint = {
      type: "Point",
      coordinates: [lng, lat],
    };

    if (update.$set) {
      update.$set.geo = geoPoint;
    } else {
      update.geo = geoPoint;
    }
  }

  this.setUpdate(update);
  next();
});

module.exports = mongoose.model("BrokerLocation", brokerLocationSchema);
