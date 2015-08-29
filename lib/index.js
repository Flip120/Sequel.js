(function(){

    var doAsync = (function(){
        if(this.location){
            return function(cb, value){
                window.setTimeout(function(){
                    cb(value);
                }, 1);
            };
        }
        else {
            return function(cb, value){
                process.nextTick(function(){
                    cb(value);
                });
            };
        }
    }).apply(this);

    var StatusPool = function(){
        return {
            _idx : 0,
            _currentSequences : [],

            _poolLength : 0,

            addValue : function(value){
                if(Array.isArray(value)){
                    this._addArrayValue(value);
                }
                else{
                    this._addPrimitiveValue(value);
                }
                this._updateIndex();
            },

            _addArrayValue : function(arrValue){
                for (var i = this._currentSequences.length - 1; i >= 0; i--) {
                    this._currentSequences[i] = this._currentSequences[i].concat(arrValue);
                }
                this._currentSequences[this._idx] = arrValue;
            },

            _addPrimitiveValue : function(primitiveValue){
                for (var i = this._currentSequences.length - 1; i >= 0; i--) {
                    this._currentSequences[i].push(primitiveValue);
                }
                this._currentSequences[this._idx] = [primitiveValue];
            },

            _updateIndex : function(){
                if(this._idx < this._poolLength - 1 ){
                    this._idx ++;
                }
                else{
                    this._idx = 0;
                }
            },

            flush : function(){
                this._currentSequences = [];
                this._idx = 0;
            },

            removeAtIndex : function(index){
                this._currentSequences.splice(index, 1);
            },

            sequenceStatusIsRealizable : function(seq){
                for (var i = this._currentSequences.length - 1; i >= 0; i--) {
                    var _currentSequences = this._currentSequences[i];
                    if(this._currentSequences.length <= seq.length){
                        return true;
                    }
                }
                return false;
            },

            setPoolLength : function(poolLength){
                this._poolLength = poolLength;
            },

            getStatus : function(){
                return {
                    seqStatus : this._currentSequences,
                    idx : this._idx,
                    poolLength : this._poolLength
                };
            },

            isSequenceDone : function(seq){
                for (var k = 0, length = this._currentSequences.length; k < length; k++) {
                    var seqKeys = this._currentSequences[k];
                    var seqDone = this._arraysEqual(seqKeys, seq);
                    if(seqDone){
                        return true;
                    }
                }
                return false;
            },

            _arraysEqual : function (arr1, arr2) {
                if(arr1.length !== arr2.length)
                    return false;
                for(var i = arr1.length; i--;) {
                    if(arr1[i] !== arr2[i])
                        return false;
                }

                return true;
            }
        }
    };

    var SequentlyJS = function(){

            this._seqId = 0,
            this._sequences = [],
            this._started = false,
            this._currentStatus = new StatusPool(),

            this.addSequence = function(sequence, options) {
                if(!options.id){
                    options.id = this._seqId;
                    this._seqId ++;
                }

                sequence._options = options;
                this._sequences.push(sequence);

                var maxSeqLength = this._getMostLargeSequenceLength();
                this._currentStatus.setPoolLength(maxSeqLength);

            	return {
                    id : options.id,
                    value : sequence
                };
            },

            this.addValue = function (value) {
                this._pushValue(value);
               //  var accomplishedSeq = this._getAccomplishedSequence();
               //  if(accomplishedSeq && accomplishedSeq._options.callback){
             		// accomplishedSeq._options.callback.call(this);
               //      if(accomplishedSeq._options.once){
               //          this.removeSequenceById(accomplishedSeq._options.id);
               //      }
               //  }

                this._getAccomplishedSequenceAsync((function(sequence){
                    var accomplishedSeq = sequence;
                    if(accomplishedSeq && accomplishedSeq._options.callback){
                        accomplishedSeq._options.callback.call(this);
                        if(accomplishedSeq._options.once){
                            this.removeSequenceById(accomplishedSeq._options.id);
                        }
                    }
                }).bind(this));

            },

            this.removeSequenceById = function(seqId){
                for (var i = this._sequences.length - 1; i >= 0; i--) {
                    var seq = this._sequences[i];
                    if(seq._options.id == seqId){
                        this._sequences.splice(i, 1);
                        return;
                    }
                };
            },

            this.flushStatus = function () {
                this._currentStatus.flush();
            },

            this.flushSequences = function () {
                this._sequences = [];
            },

            this.getStatus = function(){
                return {
                    currentStatus : this._currentStatus.getStatus(),
                    sequences      : this._sequences
                };
            },

            this._getMostLargeSequenceLength = function(){
                var maxSeqLength = 0;
                for (var i = this._sequences.length - 1; i >= 0; i--) {
                    maxSeqLength = Math.max(maxSeqLength, this._sequences[i].length);
                };
                return maxSeqLength;
            },

            this._getAccomplishedSequence = function () {
            	for (var i = this._sequences.length - 1; i >= 0; i--) {
            		var seq = this._sequences[i];
                    if(this._isSequenceDone(seq)){
                        return seq;
            		}
            	};
                return false;
            },
            this._getAccomplishedSequenceAsync = function (cb) {

                var checkIfSequenceIsDone = (function (index){
                    
                    if(index < this._sequences.length){
                        //process.nextTick
                        var seq = this._sequences[index];
                        if(this._isSequenceDone(seq)){
                            doAsync(cb,seq);
                        }
                        else {
                            doAsync(function(){
                                doAsync(checkIfSequenceIsDone, index + 1);    
                            });
                        }
                    }
                    else{
                        cb(false);
                    }
                }).bind(this);
                checkIfSequenceIsDone(0);
            },
            this._currentStatusLengthAreTheCorrect = function () {
                for (var i = this._sequences.length - 1; i >= 0; i--) {
                    var seq = this._sequences[i];
                    if(this._currentStatus.length == seq.length){
                        return true;
                    }
                }
                return false;
            },

            this._destroyUnacomplishableSequenceStatus = function(index){
                this._currentStatus.removeAtIndex(index);
            },

            this._isSequenceDone = function(sequence){
                return this._currentStatus.isSequenceDone(sequence);
            },

            this._pushValue = function (value) {
                this._currentStatus.addValue(value);
            };
    };

    //TODO, change to callback workflow to enable the async behaviour for node
    var predefSequences = {
        KONAMI_KODE : [38,38,40,40,37,39,37,39,66,65,13]
    }

    var getInstance = function(){

        var sequentlyJs = new SequentlyJS()

        return {
            addSequence    : sequentlyJs.addSequence.bind(sequentlyJs),
            addValue       : sequentlyJs.addValue.bind(sequentlyJs),
            flushStatus    : sequentlyJs.flushStatus.bind(sequentlyJs),
            flushSequences : sequentlyJs.flushSequences.bind(sequentlyJs),
            predef         : predefSequences,
            debug          : sequentlyJs.getStatus.bind(sequentlyJs)
        };
    }

    this.ConsecutiveJS = {
        getInstance : getInstance
    };

}).apply( (typeof module !== 'undefined' && typeof module.exports !== 'undefined')? module.exports : window);
