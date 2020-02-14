const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const EMR_User = mongoose.model('emr-users');
//const NursingAssessmentModel = mongoose.model('assessmentModel'); // not working for embedding collection
const NursingAssessmentModel = require('./NursingAssessmentModel');


// Create Schema
const WoundMasterSchema = new Schema({
    patientID: { type: String, require: true },
    nric: { type: String, default: '' },
    familyName: { type: String, default: '' },
    givenName: { type: String, default: '' },
    userID: {
        type: Schema.Types.ObjectId,
        ref: 'emr-users' 	// collection name in mongodb
    },
    nursingAssessmentID: {
        type: Schema.Types.ObjectId,
        ref: 'nursing-assessment'
    },
    datetime: { type: String, default: '' },
    date: { type: String, default: '' },
    time: { type: String, default: '' },
    studentName: { type: String, default: '' },
    woundID: { type: String, default: '' },
    gender: { type: String, default: '' },
    woundLabel: { type: String, default: '' },
    markerID: { type: String, default: '' },
    woundP1: { type: String, default: '' },
    woundP2: { type: String, default: '' },
    woundCat: { type: String, default: '' },
    woundtype: { type: String, default: '' },
    woundLocation: { type: String, default: '' },
    woundL: { type: String, default: '' },
    woundW: { type: String, default: '' },
    woundD: { type: String, default: '' },
    wounddrain: { type: String, default: '' },
    woundodor: { type: String, default: '' },
    woundedges: { type: String, default: '' },
    periwound: { type: String, default: '' },
    dresswound: { type: String, default: '' },
    solutionsU: { type: String, default: '' },
    interventions: { type: String, default: '' },
    patientresponse: { type: String, default: '' },
    woundremarks: { type: String, default: '' },
    woundstatus: { type: String, default: '' }

});

// Create collection and add schema
mongoose.model('masterWound', WoundMasterSchema, 'master-wound');