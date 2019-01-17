#ifdef __cplusplus
extern "C" {
#endif


#include <string.h>
#include <iostream>
#include <cstdint>
#include <v8.h>
#include <node.h>
#include "cfdp_data_structures.h"
#include "cfdp_config.h"
#include "cfdp.h"


typedef struct
{
	const char * TempBaseDir 		= DEFAULT_TEMP_BASE_DIR;
	const char * TempFileNamePrefix = DEFAULT_TEMP_FILE_NAME_PREFIX;

} CF_Config;

typedef struct
{
    uint8_t   Octet1;
    uint16_t  PDataLen;
    uint8_t   Octet4;
    uint16_t  SrcEntityId;
    uint32_t  TransSeqNum;
    uint16_t  DstEntityId;

}OS_PACK PDU_Hdr_t;

typedef struct
{
	uint8_t Chan;
	uint8_t Class;
	uint8_t Priority;
	uint8_t Preserve;
	uint8_t CmdOrPoll;
	char 	PeerEntityId[MAX_CFG_VALUE_CHARS];
	char	SrcPath[OS_MAX_PATH_LEN];
	char	DstPath[OS_MAX_PATH_LEN];

}QueueDirFiles;

typedef struct
{
    void     *    Prev;
    void     *    Next;
    uint8_t       Priority;
    uint8_t       Class;
    uint8_t       ChanNum;
    uint8_t       Source;
    uint8_t       NodeType;
    uint8_t       CondCode;
    uint8_t       Status;
    uint8_t       Preserve;
    uint32_t      TransNum;
    uint8_t       Warning;
    char          SrcEntityId[MAX_CFG_VALUE_CHARS];
    char          PeerEntityId[MAX_CFG_VALUE_CHARS];
    char          SrcFile[OS_MAX_PATH_LEN];
    char          DstFile[OS_MAX_PATH_LEN];

}QueueEntry;

typedef struct
{
    QueueEntry   *  HeadPtr;
    QueueEntry   *  TailPtr;
    uint32_t        EntryCnt;

}Queue;

typedef struct
{
    Queue                  	  PbQ[QUEUES_PER_CHAN];
    uint32_t                  HandshakeSemId;
    uint32_t                  PendQTimer;
    uint32_t                  PollDirTimer;
    uint32_t                  DataBlast;
    uint32_t                  TransNumBlasting;

}ChannelData;

typedef struct
{

	CF_HkPacket 		Hk;
	CF_TransPacket 		Trans;
	uint32_t			RunStatus;
	uint8_t				Spare[3];
	Queue				UpQ[NUM_UPLINK_QUEUES];
	ChannelData			Chan[MAX_PLAYBACK_CHANNELS];
	CFDP_DATA			RawPduInputBuf;
	char 				BaseDir[CF_MAX_PATH_LEN];

}CF_AppData;


CF_AppData AppData;

CF_Config Config;

static ChannelData		Chan[CF_MAX_PLAYBACK_CHANNELS];


QueueEntry* FindUpNodeByTransID(uint32_t , char *, uint32_t );

void Indication (INDICATION_TYPE IndType, TRANS_STATUS TransInfo);

boolean isPduOutputReady (PDU_TYPE PduType, TRANSACTION TransInfo,ID DestinationId);

void SendPduOutput (TRANSACTION TransInfo,ID DestinationId, CFDP_DATA *PduPtr);

boolean isPduOutputOpen (ID , ID );

boolean cfdp_give_pdu (CFDP_DATA pdu);

boolean cfdp_give_request (const char *);

SUMMARY_STATUS cfdp_summary_status (void);

boolean cfdp_id_from_string (const char *, ID *);

boolean cfdp_transaction_status (TRANSACTION , TRANS_STATUS *);

void cfdp_cycle_each_transaction (void);

CF_FILE * FileOpen(const char *, const char *);

size_t FileRead(void *, size_t ,size_t , CF_FILE *);

size_t FileWrite(const void *, size_t ,size_t , CF_FILE *);

int FileClose(CF_FILE *);

int FileSeek(CF_FILE *, long int , int );

int32_t Seek(int32_t  , int32_t , uint32_t );

int RemoveFile(const char *);

int RenameFile(const char *, const char *);

u_int_4 FileSize(const char *);

int ErrorEvent(const char *Format, ...);

int DebugEvent(const char *Format, ...);

int InfoEvent(const char *Format, ...);

int WarningEvent(const char *Format, ...);

void RegisterCallbacks(void);


using namespace v8;

typedef struct
{

	boolean IsDefined = false;

	Persistent <Function> Function;

} CallbackData;

CallbackData LogInfo;

CallbackData LogError;

CallbackData LogDebug;

CallbackData LogWarning;

CallbackData pduOutputOpen;

CallbackData pduOutputReady;

CallbackData PduOutputSend;


std::string Util_GetStdString(v8::Local<v8::String>);

void SetCallbackData(CallbackData * , Isolate * , v8::Local<v8::Value> );

#ifdef __cplusplus
}
#endif
