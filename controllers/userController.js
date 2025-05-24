const User = require('../models/User');

// @desc    Update user details
// @route   PUT /api/users/update
// @access  Private
exports.updateUser = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    }).select('-pin');

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change PIN
// @route   PUT /api/users/change-pin
// @access  Private
exports.changePin = async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;

    // Get user with PIN field
    const user = await User.findById(req.user.id).select('+pin');

    // Check current PIN
    const isMatch = await user.matchPin(currentPin);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current PIN is incorrect',
      });
    }

    // Update PIN
    user.pin = newPin;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'PIN changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload user avatar
// @route   PUT /api/users/avatar
// @access  Private
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload an image file.' });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    user.avatar = {
      data: req.file.buffer,
      contentType: req.file.mimetype
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully.',
    });

  } catch (error) {
    console.error('Avatar Upload Error:', error);
    next(error);
  }
};

// @desc    Get user avatar
// @route   GET /api/users/:userId/avatar
// @access  Public (or Private, adjust 'protect' middleware in routes if needed)
exports.getUserAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select('+avatar.data +avatar.contentType'); // Explicitly select avatar fields
    if (!user || !user.avatar || !user.avatar.data) {
      return res.status(404).json({ success: false, error: 'Avatar not found.' });
    }
    res.set('Content-Type', user.avatar.contentType);
    res.send(user.avatar.data);
  } catch (error) {
    next(error);
  }
};