const Profession = require('../models/Profession');
const User = require('../models/User');

exports.addProfession = async (req, res) => {
  console.log("Hiii", req.body);
  console.log("Authenticated user (from token):", req.user ? req.user.id : "No user in req.user");

  try {
    const {
      // userId is no longer taken from req.body for security
      name,
      email,
      mobileNo,
      secondaryMobileNo,
      state,
      district,
      city,
      serviceCategory,
      serviceName,
      designation,
      experience,
      servicePrice, // Will be handled conditionally
      priceUnit,    // Will be handled conditionally
      needSupport,
      professionDescription
    } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'User not authenticated to add profession.' });
    }

    const professionPayload = {
      user: req.user.id, // Use the ID from the authenticated user
      name,
      email,
      mobileNo,
      secondaryMobileNo,
      state,
      district,
      city,
      serviceCategory,
      serviceName,
      designation,
      experience,
      needSupport,
      professionDescription
      // servicePrice and priceUnit are handled next
    };

    // Conditionally add servicePrice if it's a valid number
    if (servicePrice !== undefined && servicePrice !== null && String(servicePrice).trim() !== '') {
      const parsedPrice = parseFloat(servicePrice);
      if (!isNaN(parsedPrice)) {
        professionPayload.servicePrice = parsedPrice;
      }
      // If not a valid number, servicePrice is simply not added to the payload,
      // and Mongoose will not try to save it (making it truly optional).
    }

    // Conditionally add priceUnit if provided by client; otherwise, schema default applies
    if (priceUnit !== undefined) {
      professionPayload.priceUnit = priceUnit;
    }

    // Create new profession with the constructed payload
    const profession = await Profession.create(professionPayload);

    // Update user's isProfession flag to true
    await User.findByIdAndUpdate(req.user.id, { isProfession: true });

    res.status(201).json({ success: true, data: profession });

  } catch (err) {
    console.error("Error while saving profession:", err);
    // Check for Mongoose validation error
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }
    res.status(400).json({ success: false, error: err.message || 'Failed to add profession.' });
  }
};

exports.getProfessionalsByService = async (req, res) => {
  
  try {
    const { serviceName } = req.query;

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        error: 'Service name is required'
      });
    }

    // Using a case-insensitive regex to find matches
    // This will find "Plumber", "plumber", "PLUMBER", etc.
    // It also allows partial matches if serviceName is part of a larger string in the DB.
    // If you need exact matches only (but still case-insensitive), you might adjust the regex.
    const professions = await Profession.find({
      serviceName: { $regex: `^${serviceName}$`, $options: 'i' }, 
    }).select('-__v'); // Exclude the __v field from the results

    res.status(200).json({
      success: true,
      data: professions
    });
  } catch (err) {
    console.error("Error while fetching professionals:", err);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching professionals',
      details: err.message
    });
  }
};

exports.updateUserProfessionalProfile = async (req, res) => {
  try {
    const userId = req.user.id; // From 'protect' auth middleware
    const {
      name, 
      email, 
      mobileNo, 
      secondaryMobileNo,
      state,
      district,
      city,
      serviceCategory,
      serviceName,
      designation,
      experience,
      servicePrice,
      priceUnit,
      needSupport,
      professionDescription,
    } = req.body;

    let professionalProfile = await Profession.findOne({ user: userId });

    if (!professionalProfile) {
      return res.status(404).json({ success: false, error: 'Professional profile not found. Please add one first.' });
    }

    // Update fields that are part of the Professional model
    // For fields like name, email, mobileNo, these are often part of the core User model.
    // If your Professional model *also* stores these (e.g., for a specific professional listing display),
    // then update them here. Otherwise, they should be updated via a user profile update endpoint.
    if (name !== undefined) professionalProfile.name = name; 
    if (email !== undefined) professionalProfile.email = email; 
    if (mobileNo !== undefined) professionalProfile.mobileNo = mobileNo; 
    
    if (secondaryMobileNo !== undefined) professionalProfile.secondaryMobileNo = secondaryMobileNo;
    if (state !== undefined) professionalProfile.state = state;
    if (district !== undefined) professionalProfile.district = district;
    if (city !== undefined) professionalProfile.city = city;
    if (serviceCategory !== undefined) professionalProfile.serviceCategory = serviceCategory;
    if (serviceName !== undefined) professionalProfile.serviceName = serviceName;
    if (designation !== undefined) professionalProfile.designation = designation; 
    if (experience !== undefined) professionalProfile.experience = experience;
    
    if (servicePrice !== undefined) {
      if (servicePrice === null || String(servicePrice).trim() === '') {
        professionalProfile.servicePrice = undefined; // Or null, to effectively remove/unset it
      } else {
        const parsed = parseFloat(servicePrice);
        if (!isNaN(parsed)) {
          professionalProfile.servicePrice = parsed;
        }
        // else: if invalid number provided, current logic does not update it. 
        // You could add error handling or specific behavior here if needed.
      }
    }

    if (priceUnit !== undefined) professionalProfile.priceUnit = priceUnit;
    if (needSupport !== undefined) professionalProfile.needSupport = needSupport;
    if (professionDescription !== undefined) professionalProfile.professionDescription = professionDescription;

    await professionalProfile.save();

    res.json({ success: true, message: 'Professional profile updated successfully', data: professionalProfile });
  } catch (err) {
    console.error('Error updating professional profile:', err.message);
     if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }
    res.status(500).json({ success: false, error: 'Server error while updating profile', details: err.message });
  }
};
