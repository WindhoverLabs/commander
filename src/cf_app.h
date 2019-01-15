#ifdef __cplusplus
extern "C" {
#endif




#include <string.h>
#include <iostream>
#include <cstdint>
#include "cfdp_data_structures.h"
#include "cfdp_config.h"
#include "cfdp.h"

#define CFDP_MAX_CFG_VALUE_CHARS 	16
#define CFDP_MAX_PATH_LEN			256
#define CFDP_NUM_UPLINK_QUEUES		1
#define CFDP_QUEUES_PER_CHAN		3
#define CFDP_MAX_PLAYBACK_CHANNELS  2
#define CFDP_MAX_TRANSID_CHARS    	20 /* 255.255_9999999 */
#define CFDP_MAX_PARAM_LENGTH		256
#define CFDP_MAX_PARAM_ENUM_LENGTH	128
#define CFDP_MAX_ENUM_COUNT			64
#define CFDP_TELEM_PICK_LIST_COUNT	22

#define SUCCESS                				(1)
#define OS_MAX_PATH_LEN        				(64)
#define CF_MAX_CFG_VALUE_CHARS 				(16)
#define CF_QUEUES_PER_CHAN     				(3)
#define CF_NUM_UPLINK_QUEUES    			(2)
#define CF_MAX_PLAYBACK_CHANNELS            (2)

#define CF_NUM_UPLINK_QUEUES    2

#define CFDP_EVENT_MESSAGE_LENGTH 		250
#define CFDP_NUM_ENG_CYCLES_PER_WAKEUP	10
#define CFDP_MAX_ERR_STRING_CHARS		32


#define CFDP_SUCCESS            (0)  /**< \brief CF return code for success */
#define CFDP_ERROR              (-1) /**< \brief CF return code for general error */
#define CFDP_BAD_MSG_LENGTH_RC  (-2) /**< \brief CF return code for unexpected cmd length */

#define CFDP_INVALID              0xFFFFFFFF

#define CFDP_DONT_CARE            0
#define CFDP_UNKNOWN              0
#define CFDP_TRANS_SUCCESS        1
#define CFDP_TRANS_FAIL           2

#define CFDP_ENTRY_UNUSED         0
#define CFDP_ENTRY_IN_USE         1

#define CFDP_DISABLED             0
#define CFDP_ENABLED              1

#define CFDP_FALSE                0
#define CFDP_TRUE                 1

#define CFDP_CLOSED               0
#define CFDP_OPEN                 1

#define CFDP_FILE_NOT_ACTIVE      0
#define CFDP_FILE_IS_ACTIVE       1

#define CFDP_NOT_IN_PROGRESS      0
#define CFDP_IN_PROGRESS          1

#define CFDP_UP_ACTIVEQ           0
#define CFDP_UP_HISTORYQ          1

#define CFDP_PB_PENDINGQ          0
#define CFDP_PB_ACTIVEQ           1
#define CFDP_PB_HISTORYQ          2

#define CFDP_PENDINGQ             0
#define CFDP_ACTIVEQ              1
#define CFDP_HISTORYQ             2

#define CFDP_ENTRY_UNUSED         0
#define CFDP_ENTRY_IN_USE         1

#define CFDP_NOT_ISSUED           0
#define CFDP_WAS_ISSUED           1

#define CFDP_DELETE_FILE          0
#define CFDP_KEEP_FILE            1

#define CFDP_PLAYBACKFILECMD      1
#define CFDP_PLAYBACKDIRCMD       2
#define CFDP_POLLDIRECTORY        3

#define CFDP_ALL                  0
#define CFDP_UPLINK               1
#define CFDP_PLAYBACK             2

#define CFDP_INCOMING             1
#define CFDP_OUTGOING             2

#define CFDP_TLM                  0
#define CFDP_CMD                  1

#define CFDP_CLASS_1              1
#define CFDP_CLASS_2              2

#define CFDP_QUEUES_PER_CHAN      3

#define CFDP_STAT_UNKNOWN         		0
#define CFDP_STAT_SUCCESS         		1
#define CFDP_STAT_CANCELLED       		2
#define CFDP_STAT_ABANDON         		3
#define CFDP_STAT_NO_META         		4
#define CFDP_STAT_PENDING         		5
#define CFDP_STAT_ALRDY_ACTIVE    		6
#define CFDP_STAT_PUT_REQ_ISSUED  		7
#define CFDP_STAT_PUT_REQ_FAIL    		8
#define CFDP_STAT_ACTIVE          		9

typedef struct
{
    uint8_t   Octet1;
    uint16_t  PDataLen;
    uint8_t   Octet4;
    uint16_t  SrcEntityId;
    uint32_t  TransSeqNum;
    uint16_t  DstEntityId;

}OS_PACK CF_PDU_Hdr_t;

typedef struct
{
	uint8_t Chan;
	uint8_t Class;
	uint8_t Priority;
	uint8_t Preserve;
	uint8_t CmdOrPoll;
	char 	PeerEntityId[CF_MAX_CFG_VALUE_CHARS];
	char	SrcPath[OS_MAX_PATH_LEN];
	char	DstPath[OS_MAX_PATH_LEN];

}CF_QueueDirFiles;

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
    char          SrcEntityId[CF_MAX_CFG_VALUE_CHARS];
    char          PeerEntityId[CF_MAX_CFG_VALUE_CHARS];
    char          SrcFile[OS_MAX_PATH_LEN];
    char          DstFile[OS_MAX_PATH_LEN];

}CF_QueueEntry;


typedef struct
{
    CF_QueueEntry   *  HeadPtr;
    CF_QueueEntry   *  TailPtr;
    uint32_t           EntryCnt;

}CF_Queue;


typedef struct
{
    CF_Queue                  PbQ[CF_QUEUES_PER_CHAN];
    uint32_t                  HandshakeSemId;
    uint32_t                  PendQTimer;
    uint32_t                  PollDirTimer;
    uint32_t                  DataBlast;
    uint32_t                  TransNumBlasting;
//    CFE_SB_ZeroCopyHandle   ZeroCpyHandle;
//    CFE_SB_Msg      *       ZeroCpyMsgPtr;

}CF_ChannelData;




typedef struct
{
	CF_HkPacket 		HK;
	CF_TransPacket 		Trans;
//	CFE_SB_MsgPtr		MsgPtr;
	uint32_t			RunStatus;
	uint8_t				Spare[3];
	CF_Queue			UpQ[CF_NUM_UPLINK_QUEUES];
	CF_ChannelData		Chan[CF_MAX_PLAYBACK_CHANNELS];
//	CF_ConfigPacket		CfgPkt;
	CFDP_DATA			RawPduInputBuf;
}CF_AppData;

CF_AppData AppData;

static CF_ChannelData		Chan[CFDP_MAX_PLAYBACK_CHANNELS];

char BaseDir[CFDP_MAX_PATH_LEN];



int CF_TableInit (void);
int CF_ChannelInit(void);
int CF_RegisterCallbacks(void);
int CF_SetMibParams(void);

boolean CF_PduOutputOpen (ID , ID );

boolean cfdp_give_pdu (CFDP_DATA pdu);

void cfdp_cycle_each_transaction (void);

CFDP_FILE * CF_Fopen(const char *, const char *);

size_t CF_Fread(void *, size_t ,size_t , CFDP_FILE *);

size_t CF_Fwrite(const void *, size_t ,size_t , CFDP_FILE *);

int CF_Fclose(CFDP_FILE *);

int CF_Fseek(CFDP_FILE *, long int , int );

int32_t CF_Tmpcreat(const char *, int32_t  );

int32_t CF_Tmpopen(const char *,  int32_t ,  uint32_t );

int32_t CF_Tmpclose(int32_t);

int32_t CF_Tmpread(int32_t , void *, uint32_t );

int32_t CF_Tmpwrite(int32_t  , void *, uint32_t );

int32_t CF_Tmplseek(int32_t  , int32_t , uint32_t );

int CF_RemoveFile(const char *);

int CF_RenameFile(const char *, const char *);

u_int_4 CF_FileSize(const char *);

int CF_ErrorEvent(const char *Format, ...);

int CF_DebugEvent(const char *Format, ...);

int CF_InfoEvent(const char *Format, ...);

int CF_WarningEvent(const char *Format, ...);

void CF_Indication (INDICATION_TYPE IndType, TRANS_STATUS TransInfo);

boolean CF_PduOutputReady (PDU_TYPE PduType, TRANSACTION TransInfo,ID DestinationId);

void CF_PduOutputSend (TRANSACTION TransInfo,ID DestinationId, CFDP_DATA *PduPtr);

std::string Util_GetStdString(v8::Local<v8::String>);

CF_QueueEntry* FindUpNodeByTransID(uint32_t , char *, uint32_t );




#ifdef __cplusplus
}
#endif
