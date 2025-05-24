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
    };

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
    console.log("Backend Controller: Received req.query:", JSON.stringify(req.query)); // Add this log
    const { serviceName, serviceCategory } = req.query;

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        error: 'Service name query parameter is required'
      });
    }

    const queryOptions = {
      // Ensure serviceName is treated as a literal string for the regex
      serviceName: { $regex: `^${serviceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    };

    if (serviceCategory) {
      // Ensure serviceCategory is treated as a literal string for the regex
      queryOptions.serviceCategory = { $regex: `^${serviceCategory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
    }

    console.log("Backend: Executing query with options:", JSON.stringify(queryOptions)); // Log the exact query

    const professionsFromDB = await Profession.find(queryOptions).select('-__v').lean(); // Use .lean() for plain JS objects
    
    // Manually fetch user avatar status for each professional
    const professionsWithAvatarInfo = await Promise.all(
      professionsFromDB.map(async (prof) => {
        const user = await User.findById(prof.user).select('avatar.data avatar.contentType').lean();
        const hasAvatar = !!(user && user.avatar && user.avatar.data && user.avatar.contentType);
        return {
          ...prof,
          userIdForAvatar: prof.user, // Pass the user ID for avatar URL construction
          hasAvatar: hasAvatar,
        };
      })
    );

    console.log(`Backend: Found ${professionsWithAvatarInfo.length} professionals for query:`, JSON.stringify(queryOptions));
    // If professions.length is > 0, log the first one to inspect its serviceCategory
    if (professionsWithAvatarInfo.length > 0) {
        console.log("Backend: First matching professional's serviceCategory:", professionsWithAvatarInfo[0].serviceCategory);
    }

    res.status(200).json({
      success: true,
      data: professionsWithAvatarInfo // Send data with avatar info
                       // For HomeScreen counts, it's response.data.length
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

// exports.getProfessionalsByService = async (req, res) => {
//   try {
//     const { serviceName, serviceCategory } = req.query; // Add serviceCategory

//     if (!serviceName) {
//       return res.status(400).json({
//         success: false,
//         error: 'Service name query parameter is required'
//       });
//     }

//     const queryOptions = {
//       serviceName: { $regex: `^${serviceName}$`, $options: 'i' }, // Exact match for serviceName
//     };

//     if (serviceCategory) {
//       queryOptions.serviceCategory = { $regex: `^${serviceCategory}$`, $options: 'i' }; // Exact match for serviceCategory
//     }

//     const professions = await Profession.find(queryOptions).select('-__v');

//     res.status(200).json({
//       success: true,
//       data: professions
//     });
//   } catch (err) {
//     console.error("Error while fetching professionals:", err);
//     res.status(500).json({
//       success: false,
//       error: 'Server error while fetching professionals',
//       details: err.message
//     });
//   }
// };

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
