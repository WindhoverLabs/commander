#ifdef __cplusplus
extern "C" {
#endif


#include <string.h>
#include <iostream>
#include <cstdint>
#include <v8.h>
#include <node.h>
#include <uv.h>
#include "cfdp_data_structures.h"
#include "cfdp_config.h"
#include "cfdp.h"


using namespace v8;

typedef struct
{

	boolean IsDefined = false;
	Persistent <Function> Function;

} CallbackData;



typedef struct
{
	const char * TempBaseDir 		= DEFAULT_TEMP_BASE_DIR;

} CF_Config;

typedef struct
{


	CFDP_DATA			RawPduInputBuf;
	char 				BaseDir[CF_MAX_PATH_LEN];

}CF_AppData;

typedef struct
{
	uv_work_t  request;
	Persistent<Function> callback;
	char   tempStrA[CF_MAX_PATH_LEN];
	char   tempStrB[CF_MAX_PATH_LEN];
	char   tempStrC[CF_MAX_PATH_LEN];

} Worker;

static const char * PduTypeEMap[] = {
		  "FILE_DIR_PDU",
		  "FILE_DATA_PDU"
};

static const char * ConditionCode[] = {
		  "NO_ERROR",
		  "POSITIVE_ACK_LIMIT_REACHED",
		  "KEEP_ALIVE_LIMIT_REACHED",
		  "INVALID_TRANSMISSION_MODE",
		  "FILESTORE_REJECTION",
		  "FILE_CHECKSUM_FAILURE",
		  "FILE_SIZE_ERROR",
		  "NAK_LIMIT_REACHED",
		  "INACTIVITY_DETECTED",
		  "INVALID_FILE_STRUCTURE",
		  "RESERVED_BY_CCSDS_10",
		  "RESERVED_BY_CCSDS_11",
		  "RESERVED_BY_CCSDS_12",
		  "RESERVED_BY_CCSDS_13",
		  "SUSPEND_REQUEST_RECEIVED",
		  "CANCEL_REQUEST_RECEIVED"
};

static const char * Response[] = {
		  "RESPONSE_RESERVED_0",
		  "RESPONSE_CANCEL",
		  "RESPONSE_SUSPEND",
		  "RESPONSE_IGNORE",
		  "RESPONSE_ABANDON",
		  "RESPONSE_RESERVED_5", "RESPONSE_RESERVED_6", "RESPONSE_RESERVED_7",
		  "RESPONSE_RESERVED_8", "RESPONSE_RESERVED_9", "RESPONSE_RESERVED_10",
		  "RESPONSE_RESERVED_11","RESPONSE_RESERVED_12","RESPONSE_RESERVED_13",
		  "RESPONSE_RESERVED_14","RESPONSE_RESERVED_15"
};

static const char * State[] = {
		"UNINITIALIZED", "S1", "S2", "S3", "S4", "S5", "S6", "FINISHED"
};

static const char * Role[] = {
		  "ROLE_UNDEFINED",
		  "CLASS_1_SENDER",
		  "CLASS_1_RECEIVER",
		  "CLASS_2_SENDER",
		  "CLASS_2_RECEIVER"
};

static const char * DeliveryCode[] = {
		"DONT_CARE_0", "DONT_CARE_1", "DATA_COMPLETE", "DATA_INCOMPLETE"
};

static const char * TimerType[] = {
		  "NO_TIMER",
		  "ACK_TIMER",
		  "NAK_TIMER",
		  "INACTIVITY_TIMER"
};

static const char * IndicationType[] = {
		  "IND_ABANDONED",
		  "IND_ACK_TIMER_EXPIRED",
		  "IND_EOF_RECV",
		  "IND_EOF_SENT",
		  "IND_FAULT",
		  "IND_FILE_SEGMENT_SENT",
		  "IND_FILE_SEGMENT_RECV",
		  "IND_INACTIVITY_TIMER_EXPIRED",
		  "IND_MACHINE_ALLOCATED",
		  "IND_MACHINE_DEALLOCATED",
		  "IND_METADATA_RECV",        /* Typical transaction startup at Receiving end */
		  "IND_METADATA_SENT",
		  "IND_NAK_TIMER_EXPIRED",
		  "IND_REPORT",
		  "IND_RESUMED",
		  "IND_SUSPENDED",
		  "IND_TRANSACTION",          /* Transaction startup at Sending end */
		  "IND_TRANSACTION_FINISHED"
};

static const char * FinalStatus[] = {
		  "FINAL_STATUS_UNKNOWN",
		  "FINAL_STATUS_SUCCESSFUL",
		  "FINAL_STATUS_CANCELLED",
		  "FINAL_STATUS_ABANDONED",
		  "FINAL_STATUS_NO_METADATA"
};



TRANS_STATUS ts_q;

CF_AppData AppData;

CF_Config Config;

CallbackData LogInfo;

CallbackData LogError;

CallbackData LogDebug;

CallbackData LogWarning;

CallbackData pduOutputOpen;

CallbackData pduOutputReady;

CallbackData PduOutputSend;

CallbackData IndicationHandle;

CallbackData TransactionStatusHandle;

boolean CycleStopSignal = false;
boolean invoke_cycle = true;

boolean SendPdToEngine = false;

Isolate * isolate;

typedef enum
{
  NO_SCH = 0,
  IS_PDU_OPEN= 1,
  IS_PDU_READY= 2,
  PDU_SEND= 3,
  INDICATION= 4
} SCH_CB;


typedef struct {
	PDU_TYPE 	ptype;
	TRANSACTION tinfo;
	ID			destid;
} PduReady;

typedef struct {
	ID			srcid;
	ID			destid;
} PduOpen;

typedef struct {
	TRANSACTION tinfo;
	ID			destid;
	CFDP_DATA *	pduptr;
} PduSend;

typedef struct {
	INDICATION_TYPE 	indtype;
	TRANS_STATUS 		tinfo;
} Indicate;


PduReady 	isPduReadyPacket;
PduOpen 	isPduOpenPacket;
PduSend 	pduSendPacket;
Indicate 	indicationPacket;


uv_loop_t *loop;
uv_async_t async;


/* CFDP */
void PduOutputOpenCb(void);
void PduOutputSendCb(void);
void PduOutputReadyCb(void);
void IndicationCb(void);

void print_progress(uv_async_t *);

void CycleWorker(uv_work_t * );

void CycleShutdown(uv_work_t * );

void CyclePduGiveWorker(uv_work_t * );

boolean cfdp_give_pdu (CFDP_DATA pdu);

boolean cfdp_give_request (const char *);

SUMMARY_STATUS cfdp_summary_status (void);

boolean cfdp_id_from_string (const char *, ID *);

boolean cfdp_transaction_status (TRANSACTION , TRANS_STATUS *);

void cfdp_cycle_each_transaction (void);

boolean cfdp_get_mib_parameter (const char *, char *);


/* CFV8 API */

void tsCallbackHandle(void);

void Indication (INDICATION_TYPE IndType, TRANS_STATUS TransInfo);

boolean isPduOutputReady (PDU_TYPE PduType, TRANSACTION TransInfo,ID DestinationId);

void SendPduOutput (TRANSACTION TransInfo,ID DestinationId, CFDP_DATA *PduPtr);

boolean isPduOutputOpen (ID , ID );

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

std::string Util_GetStdString(v8::Local<v8::String>);

void SetCallbackData(CallbackData * , Isolate * , v8::Local<v8::Value> );



#ifdef __cplusplus
}
#endif
