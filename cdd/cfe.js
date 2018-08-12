

var Parser = require("binary-parser").Parser;


var CFE_ES_HkPacket_t = new Parser()
    .endianess('little')
    .uint8('CmdCounter')
    .uint8('ErrCounter')
    .uint16('CFECoreChecksum')
    .uint8('CFEMajorVersion')
    .uint8('CFEMinorVersion')
    .uint8('CFERevision')
    .uint8('CFEMissionRevision')
    .uint8('OSALMajorVersion')
    .uint8('OSALMinorVersion')
    .uint8('OSALRevision')
    .uint8('OSALMissionRevision')
    .uint32('SysLogBytesUsed')
    .uint32('SysLogSize')
    .uint32('SysLogEntries')
    .uint32('SysLogMode')
    .uint32('ERLogIndex')
    .uint32('ERLogEntries')
    .uint32('RegisteredCoreApps')
    .uint32('RegisteredExternalApps')
    .uint32('RegisteredTasks')
    .uint32('RegisteredLibs')
    .uint32('ResetType')
    .uint32('ResetSubtype')
    .uint32('ProcessorResets')
    .uint32('MaxProcessorResets')
    .uint32('BootSource')
    .uint32('PerfState')
    .uint32('PerfMode')
    .uint32('PerfTriggerCount')
    .array('PerfFilterMask', {
        type: 'uint32le',
        length: 4
    })
    .array('PerfTriggerMask', {
        type: 'uint32le',
        length: 4
    })
    .uint32('PerfDataStart')
    .uint32('PerfDataEnd')
    .uint32('PerfDataCount')
    .uint32('PerfDataToWrite')
    .uint32('HeapBytesFree')
    .uint32('HeapBlocksFree')
    .uint32('HeapMaxBlockSize');

