#ifdef __cplusplus
extern "C" {
#endif

#include <cstdint>
#include "cfdp_data_structures.h"
#include "cfdp_config.h"
#include "cfdp.h"

#define SUCCESS                				(1)
#define OS_MAX_PATH_LEN        				(64)
#define CF_MAX_CFG_VALUE_CHARS 				(16)
#define CF_QUEUES_PER_CHAN     				(3)
#define CF_NUM_UPLINK_QUEUES    			(2)
#define CF_MAX_PLAYBACK_CHANNELS            (2)

#define CF_NUM_UPLINK_QUEUES    2

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





#ifdef __cplusplus
}
#endif
