/* FILE: cfdp.h -- a single 'include' file for CFDP library interface.
 *
 *  Copyright � 2007-2014 United States Government as represented by the 
 *  Administrator of the National Aeronautics and Space Administration. 
 *  All Other Rights Reserved.  
 *
 *  This software was created at NASA's Goddard Space Flight Center.
 *  This software is governed by the NASA Open Source Agreement and may be 
 *  used, distributed and modified only pursuant to the terms of that 
 *  agreement.
 *
 * LAST MODIFIED:  2006_07_11
 * ORIGINAL PROGRAMMER:  Tim Ray 301-286-0581
 * SUMMARY:  This one file includes the entire CFDP library interface.
 * OFFICIAL CFDP SPECS:
 *   The official CFDP specs are published in the CFDP Blue Book,
 *   CCSDS document #727.0-B-3, available at 'www.ccsds.org'.
 *   There are also two official Green Books, which help explain what
 *   CFDP is and how to implement it:
 *     720.1-G-2  CFDP Introduction and Overview
 *     720.2-G-2  CFDP Implementers Guide.
 * OTHER HELPFUL INFO:
 *   There is a CFDP library Users Guide.
 *   There is a powerpoint slide presentation that summarizes CFDP.
 *   Both are available from Tim Ray at 301-286-0581 or tim.ray@nasa.gov.
 * CONFIGURING THIS LIBRARY:
 *   The library user is free to modify the file 'cfdp_config.h'; the
 *   other library interface files should not be modified.
 */

/* List of CFDP library interface files:
 *    cfdp_config.h            - compile-time configuration of the library
 *    cfdp_data_structures.h   - CFDP-related data structures 
 *    cfdp_provides.h          - services provided by the library
 *    cfdp_requires.h          - services required by the library
 *    cfdp_syntax.h            - syntax of character string Requests/Directives
 */

#ifdef __cplusplus
extern "C" {
#endif


#ifndef H_CFDP
#define H_CFDP

#include "cfdp_data_structures.h"
#include <stdio.h>
#include "stdint.h"
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include "definition.h"



char *cfdp_trans_as_string (TRANSACTION transaction);

boolean cfdp_id_from_string (const char *value_as_dotted_string, ID *id);

boolean cfdp_trans_from_string (const char *string, TRANSACTION *trans);

boolean cfdp_set_mib_parameter (const char *param, const char *value);


/* List of callback routines that can be registered with the CFDP library:
 *
 *    ---- Required ----
 *    pdu_output_open          - connect to specified CFDP partner
 *    pdu_output_ready         - ok to send PDU to this partner now?
 *    pdu_output_send          - send given PDU to specified partner
 *
 *    ---- Optional ----
 *    indication               - respond to given Indication
 *    printf                   - output a message (actually several levels)
 *    fopen                    - Posix file access
 *    fseek                    -   "
 *    fread                    -   "
 *    fwrite                   -   "
 *    feof                     -   "
 *    fclose                   -   "
 *    rename                   - Posix (rename a file)
 *    remove                   - Posix (remove a file)
 *    tmpnam                   - Posix (choose temporary file name)
 *    file_size                - what is this file's size (in bytes)
 *    is_file_segmented        - is this file stored as segments?
 */

/***************************************/
/*** Protocol Data Unit (PDU) output ***/
/***************************************/

/* This section specifies the interface for output of CFDP PDUs from
 * 'my' CFDP entity to partner entities.  The library user must implement
 * these three callback routines (and register them before requesting any
 * services from the library).
 */

void register_pdu_output_open (boolean (*function) (ID my_id, ID partner_id));
/* WHEN:  The callback routine is called once at the start of each transaction.
 * WHAT:  If it has not already done so, it attempts to initialize the
 *   communication path between my CFDP entity and the specified partner
 *   entity.  If successful, returns 1; otherwise, 0.
 */

void register_pdu_output_ready
(boolean (*function) (PDU_TYPE pdu_type, TRANSACTION trans_id, ID partner_id));
/* WHEN:  The callback routine is called at least once prior to the output of
 *   each CFDP PDU.
 * WHAT:  It returns 1 if the communication path to the specified CFDP partner
 * is ready for another PDU of the specified type; otherwise, 0.
 * NOTE: The id of the transaction requesting this info is also provided.
 */

void register_pdu_output_send (void (*function)
			       (TRANSACTION trans,
				ID partner_id,
				CFDP_DATA *pdu));
/* WHEN:  The callback routine is called each time the library outputs a PDU.
 * WHAT:  The callback routine is responsible for outputting the given PDU
 *   to the specified partner.  The Transaction-ID argument is provided as a
 *   courtesy to the library user; it can be ignored.
 * NOTE:  The library meters out PDUs (i.e. it doesn't call the
 *   'pdu_output_send' callback routine until getting a green-light from
 *   the 'pdu_output_ready' callback routine).
 */



/*******************/
/*** Indications ***/
/*******************/

/* This callback routine allows the library user to provide their own
 * response to Indications (either in place of, or in addition to, the
 * default library response).
 * BACKGROUND:  CFDP specifies a discrete set of Indications that are to
 *   be issued by the protocol to the User.  For example, when a transaction
 *   completes, an Indication is issued.  CFDP does not specify what actions to
 *   take in response to each Indication; that is implementation-dependent.
 * NOTE:  Independent of this callback routine, the library will output
 *   a simple text message in response to each Indication (unless the
 *   'MSG_INDICATIONS' message-class has been disabled in 'cfdp_config.h').
 */

void register_indication (void (*function)
			  (INDICATION_TYPE, TRANS_STATUS));
/* WHEN:  This callback routine is called whenever the CFDP protocol issues
 *   an Indication (e.g. at transaction startup and shutdown).
 * WHAT:  The callback routine is given an indication-type and transaction
 *   status. The action taken is up to the implementer of the callback routine;
 *   nothing is required by CFDP.
 */



/**************/
/*** Printf ***/
/**************/

/* The library uses callback routines to output messages.  There are 4
 * callback routines - one for each severity-level (debug, info, warning,
 * and error).  All of the message callbacks match the POSIX 'printf'
 * routine.  The library user may register a *separate* callback routine for
 * each severity level.  Or, register a *single* callback routine to handle
 * all levels.  Or, accept the default callback, which is 'printf'.
 */

void register_printf (int (*function) (const char *, ...));
/* WHEN:  The callback routine is called whenever the library has a message
 *   to output to the user.
 * WHAT:  Up to the implementer.
 * NOTE:  This routines registers a *single* callback routine that will
 *   be used for all messages (i.e. all severity levels).
 */

/* These routines allow the library user to register a *separate*
 * callback routine for each severity-level.
 */
void register_printf_debug (int (*function) (const char *, ...));
void register_printf_info (int (*function) (const char *, ...));
void register_printf_warning (int (*function) (const char *, ...));
void register_printf_error (int (*function) (const char *, ...));


/*************************/
/*** Virtual Filestore ***/
/*************************/

/* The CFDP library provides a default Virtual Filestore implementation
 * that is intended to be acceptable as-is for those library users with
 * a standard filesystem.
 * NOTE:  An alias is used (i.e. 'CFDP_FILE' in place of 'FILE').
 *   This alias is defined at compile-time in 'cfdp_config.h'.
 */


/* This first set matches the C library file-access routines, and the
 * default callbacks are the actual C library routines.
 */

void register_fopen (CFDP_FILE *(*function) (const char *name,
                                             const char *mode));

void register_fseek (int (*function) (CFDP_FILE *file, long int offset,
                                      int whence));

void register_fread (size_t (*function) (void *buffer, size_t size,
                                         size_t count, CFDP_FILE *file));

void register_fwrite (size_t (*function) (const void *buff, size_t size,
                                          size_t count, CFDP_FILE *file));

void register_feof (int (*function) (CFDP_FILE *file));

void register_fclose (int (*function) (CFDP_FILE *file));


/* This second set matches Posix-compliant routines.  The default callbacks
 * are the Posix routines for 'rename' and 'remove', and a custom routine
 * for 'tmpnam'.
 */

void register_rename (int (*function) (const char *current, const char *newa));
/* WHEN:  The callback is called once each time a file is received and
 *   accepted.   (Renames the temporary file to its permanent name)
 * WHAT:  Renames a file from the given current name to the specified new name.
 */

void register_remove (int (*function) (const char *name));
/* WHEN:  The callback is called once each time a file is received and
 *   rejected (i.e. the file was not successfully received).
 * WHAT:  Deletes the specified file.
 */

void register_tmpnam (char *(*function) (char *string));
/* WHEN:  The callback is called once at the beginning of each incoming
 *   file transfer.
 * WHAT:  Determines a unused file-name that may be used as a temporary file,
 *   stores it in the given string.  The 'return status' is a pointer to the
 *   given string.
 */


/* This third set consists of specialized routines. */

void register_file_size (u_int_4 (const char *file_name));
/* WHEN:  The callback is called once at the beginning of each outgoing
 *   file transfer.
 * WHAT:  Returns the file size (in bytes) of the specified file.
 */

void register_is_file_segmented (boolean (const char *file_name));
/* WHEN:  Not currently used; this is a placeholder for possible future use. */


typedef struct
{
    uint8_t   Value;/* 0=all, 1=cmd, 2=fault 3=up 4=down */
    uint8_t   Spare[3];

} CF_ResetCtrsCmd;


typedef struct
{
    uint8_t   Class;
    uint8_t   Channel;
    uint8_t   Priority;
    uint8_t   Preserve;
    char    PeerEntityId[CF_MAX_CFG_VALUE_CHARS];/* 2 byte dotted-decimal string eg. "0.24"*/
    char    SrcFilename[OS_MAX_PATH_LEN];
    char    DstFilename[OS_MAX_PATH_LEN];

}CF_PlaybackFileCmd;


typedef struct
{
    uint8_t   Class;
    uint8_t   Chan;
    uint8_t   Priority;
    uint8_t   Preserve;
    char    PeerEntityId[CF_MAX_CFG_VALUE_CHARS];/* 2 byte dotted-decimal string eg. "0.24"*/
    char    SrcPath[OS_MAX_PATH_LEN];
    char    DstPath[OS_MAX_PATH_LEN];

}CF_PlaybackDirCmd;


typedef struct
{
    uint8_t   Chan;
    uint8_t   Spare[3];

} CF_EnDisDequeueCmd;

typedef struct
{
    uint8_t   Chan;   /* 0 to (CF_MAX_PLAYBACK_CHANNELS - 1) */
    uint8_t   Dir;    /* 0 to (CF_MAX_POLLING_DIRS_PER_CHAN - 1), or 0xFF for en/dis all */
    uint8_t   Spare[2];

} CF_EnDisPollCmd;


typedef struct
{
    uint8_t   Chan;   /* 0 to (CF_MAX_PLAYBACK_CHANNELS - 1) */
    uint8_t   Dir;    /* 0 to (CF_MAX_POLLING_DIRS_PER_CHAN - 1) */
    uint8_t   Class;
    uint8_t   Priority;
    uint8_t   Preserve;
    uint8_t   Spare[3];
    char    PeerEntityId[CF_MAX_CFG_VALUE_CHARS];
    char    SrcPath[OS_MAX_PATH_LEN];
    char    DstPath[OS_MAX_PATH_LEN];

} CF_SetPollParamCmd;


typedef struct
{
    char    Param [CF_MAX_CFG_PARAM_CHARS];
    char    Value [CF_MAX_CFG_VALUE_CHARS];
}CF_SetMibParam;


typedef struct
{
    char    Param [CF_MAX_CFG_PARAM_CHARS];
}CF_GetMibParam;


/* CARS - Cancel,Abandon,Resume,Suspend Cmds */
typedef struct
{
    char    Trans[OS_MAX_PATH_LEN];

}CF_CARSCmd;


typedef struct
{
    uint8_t   Type; /*(up=1/down=2)*/
    uint8_t   Chan;
    uint8_t   Queue;/* 0=pending,1=active,2=history */
    uint8_t   Spare;
    char    Filename[OS_MAX_PATH_LEN];

}CF_WriteQueueCmd;

typedef struct
{
    uint8_t   Type; /*(all=0/up=1/down=2)*/
    uint8_t   Spare;
    char    Filename[OS_MAX_PATH_LEN];

}CF_WriteActiveTransCmd;


typedef struct
{
    char    Trans[OS_MAX_PATH_LEN];

}CF_SendTransCmd;


typedef struct
{
    char    Trans[OS_MAX_PATH_LEN];

}CF_DequeueNodeCmd;

typedef struct
{
    uint8_t   Type;/*(up=1/down=2)*/
    uint8_t   Chan;
    uint8_t   Queue;/* 0=pending,1=active,2=history */
    uint8_t   Spare;

}CF_PurgeQueueCmd;


typedef struct
{
    uint8_t   Chan;
    uint8_t   Spare[3];

} CF_KickstartCmd;


typedef struct
{
    char    Trans[OS_MAX_PATH_LEN];

}CF_QuickStatCmd;


typedef struct
{
    uint8_t   Chan;
    uint8_t   GiveOrTakeSemaphore;

}CF_GiveTakeCmd;

typedef struct
{
    uint32_t  EnableDisable;/* 0 to disable, 1 to enable */

}CF_AutoSuspendEnCmd;

typedef struct
{
    uint32_t  NumCyclesPerWakeup;

}CF_CyclesPerWakeupCmd;


/****************************
**  CF Telemetry Formats   **
*****************************/
typedef struct
{
    uint32_t  EnFlag;
    uint32_t  LowFreeMark;

}AutoSuspend_Telemetry;

typedef struct
{
    uint32_t                  MetaCount;
    uint32_t                  UplinkActiveQFileCnt;
    uint32_t                  SuccessCounter;
    uint32_t                  FailedCounter;
    char                    LastFileUplinked[OS_MAX_PATH_LEN];

}Uplink_Telemetry;

typedef struct
{

    uint32_t                  PDUsSent;
    uint32_t                  FilesSent;
    uint32_t                  SuccessCounter;
    uint32_t                  FailedCounter;

    uint32_t                  PendingQFileCnt;
    uint32_t                  ActiveQFileCnt;
    uint32_t                  HistoryQFileCnt;

    uint32_t                  Flags;  /* 0=ChanDequeue enabled,1=Chan Blast In progress,*/
    uint32_t                  RedLightCntr;
    uint32_t                  GreenLightCntr;
    uint32_t                  PollDirsChecked;
    uint32_t                  PendingQChecked;
    uint32_t                  SemValue;

}Downlink_Telemetry;

typedef struct
{

    char                    FlightEngineEntityId[CF_MAX_CFG_VALUE_CHARS];
    uint32_t                  Flags;/* bit 0=frozen */
    uint32_t                  MachinesAllocated;
    uint32_t                  MachinesDeallocated;
    uint8_t                   are_any_partners_frozen; /* Can be true even if there are
					                                * no transactions in-progress.*/
    uint8_t                   Spare[3];
    uint32_t                  how_many_senders;        /* ...active Senders? */
    uint32_t                  how_many_receivers;      /* ...active Receivers? */
    uint32_t                  how_many_frozen;         /* ...trans are frozen? */
    uint32_t                  how_many_suspended;      /* ...trans are suspended? */
    uint32_t                  total_files_sent;        /* ...files sent succesfully */
    uint32_t                  total_files_received;    /* ...files received successfully */
    uint32_t                  total_unsuccessful_senders;
    uint32_t                  total_unsuccessful_receivers;
}Engine_Telemetry;

/* Condition Code Table Counters */
typedef struct
{

    uint8_t                   PosAckNum; /* Positive ACK Limit Counter */
    uint8_t                   FileStoreRejNum; /* FileStore Rejection Counter */
    uint8_t                   FileChecksumNum; /* File Checksum Failure Counter */
    uint8_t                   FileSizeNum; /* Filesize Error Counter */
    uint8_t                   NakLimitNum; /* NAK Limit Counter */
    uint8_t                   InactiveNum; /* Inactivity Counter */
    uint8_t                   SuspendNum;/* Suspend Request Counter */
    uint8_t                   CancelNum; /* Cancel Request Counter */

}Fault_Telemetry;

typedef struct
{
    uint32_t                  WakeupForFileProc;
    uint32_t                  EngineCycleCount;
    uint32_t                  MemInUse;
    uint32_t                  PeakMemInUse;
    uint32_t                  LowMemoryMark;
    uint32_t                  MaxMemNeeded;
    uint32_t                  MemAllocated;
    uint32_t                  BufferPoolHandle;

    uint32_t                  QNodesAllocated;
    uint32_t                  QNodesDeallocated;
    uint32_t                  PDUsReceived;
    uint32_t                  PDUsRejected;

    uint32_t                  TotalInProgTrans;
    uint32_t                  TotalFailedTrans;
    uint32_t                  TotalAbandonTrans;
    uint32_t                  TotalSuccessTrans;
    uint32_t                  TotalCompletedTrans;
    char                      LastFailedTrans[CF_MAX_TRANSID_CHARS];

}App_Telemetry;


/**
**  \cftlm CF Application housekeeping Packet
*/
typedef struct
{
    uint16_t  CmdCounter;         /**< \cftlmmnemonic \CF_CMDPC
                                \brief Count of valid commands received */
    uint16_t  ErrCounter;         /**< \cftlmmnemonic \CF_CMDEC
                                \brief Count of invalid commands received */
    App_Telemetry         App;
    AutoSuspend_Telemetry AutoSuspend;
    Fault_Telemetry       Cond;
    Engine_Telemetry      Eng;
    Uplink_Telemetry      Up;
    Downlink_Telemetry    Chan[CF_MAX_PLAYBACK_CHANNELS];

} CF_HkPacket;


typedef struct
{
    uint8_t       TransLen;
    uint8_t       TransVal;
    uint8_t       Naks; /* How many Nak PDUs have been sent/recd? */
    uint8_t       PartLen;
    uint8_t       PartVal;/* Who is this transaction with? */
    uint8_t       Phase;/* Either 1, 2, 3, or 4 */
    uint8_t       Spare1;
    uint8_t       Spare2;
    uint32_t      Flags;
    uint32_t      TransNum;
    uint32_t      Attempts;/* How many attempts to send current PDU? */
    uint32_t      CondCode;
    uint32_t      DeliCode;
    uint32_t      FdOffset;/* Offset of last Filedata sent/received */
    uint32_t      FdLength;/* Length of last Filedata sent/received */
    uint32_t      Checksum;
    uint32_t      FinalStat;
    uint32_t      FileSize;
    uint32_t      RcvdFileSize;
    uint32_t      Role;/* (e.g. Receiver Class 1) */
    uint32_t      State;
    uint32_t      StartTime;/* When was this transaction started? */
    char          SrcFile[OS_MAX_PATH_LEN];
    char          DstFile[OS_MAX_PATH_LEN];
    char          TmpFile[OS_MAX_PATH_LEN];

}CF_EngTransStat;



typedef struct
{

    uint32_t      	Status;
    uint32_t      	CondCode;
    uint32_t      	Priority;/* applies only to playback files*/
    uint32_t      	Class;
    uint32_t      	ChanNum;/* applies only to playback files*/
    uint32_t      	Source;/* from poll dir,playbackfile cmd or playback dir cmd */
    uint32_t      	NodeType;
    uint32_t      	TransNum;
    char        	SrcEntityId[CF_MAX_CFG_VALUE_CHARS];
    char        	SrcFile[OS_MAX_PATH_LEN];
    char        	DstFile[OS_MAX_PATH_LEN];


}CF_AppTransStat;




/**
**  \cftlm CF Application Single Transaction Status Packet
*/
typedef struct
{
    CF_EngTransStat   Eng;
    CF_AppTransStat   App;

}CF_TransPacket;


/**
** CF Queue Info File Entry
**
** Structure of one element of the queue information in response to CF_WRITE_QUEUE_INFO_CC
*/
typedef struct
{
    uint32_t  	TransStatus;
    uint32_t  	TransNum;/* Transaction number assigned by engine */
    char    	SrcEntityId[CF_MAX_CFG_VALUE_CHARS];/* Entity Id of file sender */
    char    	SrcFile[OS_MAX_PATH_LEN];/* Path/Filename at the source */

 }CF_QueueInfoFileEntry;


typedef struct
{
    uint32_t  EngCycPerWakeup;
    uint32_t  AckLimit;
    uint32_t  AckTimeout;
    uint32_t  NakLimit;
    uint32_t  NakTimeout;
    uint32_t  InactTimeout;
    uint32_t  DefOutgoingChunkSize;
    uint32_t  PipeDepth;
    uint32_t  MaxSimultaneousTrans;
    uint32_t  IncomingPduBufSize;
    uint32_t  OutgoingPduBufSize;
    uint32_t  NumInputChannels;
    uint32_t  MaxPlaybackChans;
    uint32_t  MaxPollingDirsPerChan;
    uint32_t  MemPoolBytes;
    uint32_t  DebugCompiledIn;
    char    SaveIncompleteFiles[8];
    char    PipeName[OS_MAX_API_NAME];
    char    TmpFilePrefix[OS_MAX_PATH_LEN];
    char    CfgTblName[OS_MAX_PATH_LEN];
    char    CfgTbleFilename[OS_MAX_PATH_LEN];
    char    DefQInfoFilename[OS_MAX_PATH_LEN];

}CF_ConfigPacket;

typedef struct stat os_fstat_t;


#endif

#ifdef __cplusplus
}
#endif
