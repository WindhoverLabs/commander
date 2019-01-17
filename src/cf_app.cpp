#include <nan.h>
#include <fstream>
#include <iostream>
#include <string>
#include <typeinfo>
#include <stdarg.h>
#include "cf_app.h"

using namespace v8;

void Indication (INDICATION_TYPE IndType, TRANS_STATUS TransInfo)
{
		QueueEntry 	*queueEntryPtr = NULL;
	    int32_t		chan;
	    char        localFinalStatBuf[CF_MAX_ERR_STRING_CHARS];
	    char        localCondCodeBuf[CF_MAX_ERR_STRING_CHARS];
	    char        entityIDBuf[CF_MAX_CFG_VALUE_CHARS];

	    /*initialization*/
	    TransInfo.md.source_file_name[MAX_FILE_NAME_LENGTH - 1] = '\0';
	    TransInfo.md.dest_file_name[MAX_FILE_NAME_LENGTH - 1] = '\0';

	    switch(IndType)
	    {
	        case IND_TRANSACTION:
	            break;

	        case IND_MACHINE_ALLOCATED:
	            /* if uplink trans, build new node */
	            if((TransInfo.role ==  CLASS_1_RECEIVER) ||
	               (TransInfo.role ==  CLASS_2_RECEIVER))
	            {
	                /* Build up a new Node */
	            	QueueEntry 	*queueEntry = new QueueEntry;
	                queueEntryPtr = queueEntry;

	                if(queueEntryPtr != NULL)
	                {
	                    /* fill-in queue entry */
	                    if(TransInfo.role ==  CLASS_1_RECEIVER)
	                        queueEntryPtr->Class = 1;
	                    else
	                        queueEntryPtr->Class = 2;

	                    queueEntryPtr->Status   = CF_STAT_ACTIVE;
	                    queueEntryPtr->CondCode = 0;
	                    queueEntryPtr->Priority = 0xFF;
	                    /* TODO:  Fix this.  Replace it with something more dynamic. */
	                    queueEntryPtr->ChanNum  = 0;
	                    queueEntryPtr->Source   = 0xFF;
	                    queueEntryPtr->Warning  = CF_NOT_ISSUED;
	                    queueEntryPtr->NodeType = CF_UPLINK;
	                    queueEntryPtr->TransNum = TransInfo.trans.number;
	                    sprintf(&queueEntryPtr->SrcEntityId[0],"%d.%d",
	                            TransInfo.trans.source_id.value[0],
	                            TransInfo.trans.source_id.value[1]);

	                    /* filenames not known until the metadata rcvd indication */
	                    strcpy(&queueEntryPtr->SrcFile[0],"UNKNOWN");
	                    strcpy(&queueEntryPtr->DstFile[0],"UNKNOWN");

	                    /* Place Node on Uplink Active Queue */
	                    // AddFileToUpQueue(CF_UP_ACTIVEQ, queueEntryPtr);
	                    InfoEvent("CFDP::AddFileToUpQueue");
	                }
	                else
	                {
	                	ErrorEvent( "AllocQueueEntry returned NULL.");
	                }
	            }
	            else
	            {
	                /* file-send transaction */
	                // queueEntryPtr = FindNodeAtFrontOfQueue(TransInfo);
	            	queueEntryPtr = 0;
	            	InfoEvent("CFDP::FindNodeAtFrontOfQueue");

	                if(queueEntryPtr != NULL)
	                {
	                	InfoEvent( "Outgoing trans started %d.%d_%d,src %s",
	                                    TransInfo.trans.source_id.value[0],
	                                    TransInfo.trans.source_id.value[1],
	                                    TransInfo.trans.number,
	                                    &TransInfo.md.source_file_name[0]);

	                    queueEntryPtr->TransNum = TransInfo.trans.number;

	                    Chan[queueEntryPtr->ChanNum].DataBlast = CF_IN_PROGRESS;
	                    Chan[queueEntryPtr->ChanNum].TransNumBlasting = TransInfo.trans.number;

	                    /* move node from pending queue to active queue */
	                    /*
	                    RemoveFileFromPbQueue(queueEntryPtr->ChanNum,
	                                                CF_PB_PENDINGQ,
	                                                queueEntryPtr);
	                    AddFileToPbQueue(queueEntryPtr->ChanNum, CF_PB_ACTIVEQ,
	                                                queueEntryPtr);
	                    */
	                    queueEntryPtr->Status = CF_STAT_ACTIVE;

	                }


	            }/* end if */

	            break;

	        case IND_METADATA_SENT:
	            break;

	        case IND_METADATA_RECV:
//	            Up.MetaCount++;

	            sprintf(entityIDBuf,"%d.%d",TransInfo.trans.source_id.value[0],
	                                        TransInfo.trans.source_id.value[1]);

	            /* file-receive transaction */
            	InfoEvent( "Incoming trans started %d.%d_%d,dest %s",
	                                TransInfo.trans.source_id.value[0],
	                                TransInfo.trans.source_id.value[1],
	                                TransInfo.trans.number,
	                                TransInfo.md.dest_file_name);

	            /*  find corresponding queue entry (created in mach allocated  */
	            /*  indication) then fill in src and dest filenames */

	            queueEntryPtr = FindUpNodeByTransID(CF_UP_ACTIVEQ, entityIDBuf, TransInfo.trans.number);

	            if(queueEntryPtr != NULL)
	            {
	                strncpy(&queueEntryPtr->SrcFile[0],TransInfo.md.source_file_name, CF_MAX_PATH_LEN);
	                strncpy(&queueEntryPtr->DstFile[0],TransInfo.md.dest_file_name, CF_MAX_PATH_LEN);
	            }

	            break;

	        case IND_EOF_SENT:
	            /* Find Channel Number, search the given queue for all channels */
	            // chan = GetChanNumFromTransId(CF_PB_ACTIVEQ, TransInfo.trans.number);
	            if(chan != CF_ERROR)
	            {
	            	/* Start transfer of next file on queue (if queue has another file) */
	                // StartNextFile(chan);
	            }

	            break;

	        case IND_EOF_RECV:
	            break;

	        case IND_TRANSACTION_FINISHED:
	            break;

	        case IND_MACHINE_DEALLOCATED:
	            /* do transaction-success processing */
	            if(TransInfo.final_status == FINAL_STATUS_SUCCESSFUL)
	            {
	                /* successful file-receive transaction processing */
	                if( (TransInfo.role ==  CLASS_1_RECEIVER) ||
	                    (TransInfo.role ==  CLASS_2_RECEIVER) )
	                {
	                    sprintf(entityIDBuf,"%d.%d",TransInfo.trans.source_id.value[0],
	                                        TransInfo.trans.source_id.value[1]);

	                    queueEntryPtr = FindUpNodeByTransID(CF_UP_ACTIVEQ, entityIDBuf, TransInfo.trans.number);
	                    if(queueEntryPtr != NULL)
	                    {
	                        queueEntryPtr->Status = CF_STAT_SUCCESS;
	                    }

//	                    Up.SuccessCounter++;
	                    // strncpy(&Up.LastFileUplinked[0], &TransInfo.md.dest_file_name[0], CF_MAX_PATH_LEN);
	                    // MoveUpNodeActiveToHistory(entityIDBuf, TransInfo.trans.number);

	                	InfoEvent( "Incoming trans success %d.%d_%d,dest %s",
	                                TransInfo.trans.source_id.value[0],
	                                TransInfo.trans.source_id.value[1],
	                                TransInfo.trans.number,
	                                &TransInfo.md.dest_file_name[0]);
	                }
	                else
	                {
	                    /* successful file-send transaction processing */
	                    // chan = GetChanNumFromTransId(CF_PB_ACTIVEQ, TransInfo.trans.number);

	                    if(chan != CF_ERROR)
	                    {
	                        // Chan[chan].SuccessCounter++;
	                    	// queueEntryPtr = FindPbNodeByTransNum(chan, CF_PB_ACTIVEQ, TransInfo.trans.number);
	                        queueEntryPtr = 0;
	                    	if(queueEntryPtr != NULL)
	                        {
	                            queueEntryPtr->Status = CF_STAT_SUCCESS;
	                        }
	                    }

	                    // if(queueEntryPtr->Preserve == CF_DELETE_FILE)
	                    // {
	                    //     OS_remove(&TransInfo.md.source_file_name[0]);
	                    // }

	                    // MoveDwnNodeActiveToHistory(TransInfo.trans.number);

	                	InfoEvent( "Outgoing trans success %d.%d_%d,src %s",
	                                    TransInfo.trans.source_id.value[0],
	                                    TransInfo.trans.source_id.value[1],
	                                    TransInfo.trans.number,
	                                    &TransInfo.md.source_file_name[0]);
	                }
	            }
	            else
	            {
	                /* do transaction-failed processing */
	                /*
	            	sprintf(&App.LastFailedTrans[0],"%d.%d_%lu",
	                        TransInfo.trans.source_id.value[0],
	                        TransInfo.trans.source_id.value[1],
	                        TransInfo.trans.number);
					*/
	                /* increment the corresponding telemetry counter */
	                // IncrFaultCtr(&TransInfo);

	                /* for error event below */
	                /*
	            	GetFinalStatString(localFinalStatBuf,
	                                      TransInfo.final_status,
	                                      CF_MAX_ERR_STRING_CHARS);
					*/
	                /* for error event below */
	                /*
	            	GetCondCodeString(localCondCodeBuf,
	                                     TransInfo.condition_code,
	                                     CF_MAX_ERR_STRING_CHARS);
					*/

	                /* failed file-receive transaction processing */
	                if( (TransInfo.role ==  CLASS_1_RECEIVER) ||
	                    (TransInfo.role ==  CLASS_2_RECEIVER) )
	                {
//	                    Up.FailedCounter++;

	                    sprintf(entityIDBuf,"%d.%d",TransInfo.trans.source_id.value[0],
	                                        TransInfo.trans.source_id.value[1]);

	                    queueEntryPtr = FindUpNodeByTransID(CF_UP_ACTIVEQ, entityIDBuf, TransInfo.trans.number);

	                    if(queueEntryPtr != NULL)
	                    {
	                        queueEntryPtr->Status = TransInfo.final_status;
	                        queueEntryPtr->CondCode = TransInfo.condition_code;
	                    }

	                    // MoveUpNodeActiveToHistory(entityIDBuf, TransInfo.trans.number);

	                	InfoEvent( "Incoming trans %d.%d_%d %s,CondCode %s,dest %s",
	                                TransInfo.trans.source_id.value[0],
	                                TransInfo.trans.source_id.value[1],
	                                TransInfo.trans.number,
	                                localFinalStatBuf,
	                                localCondCodeBuf,
	                                TransInfo.md.dest_file_name);

	                }
	                else
	                {
	                    /* failed file-send transaction processing */
	                    // chan = GetChanNumFromTransId(CF_PB_ACTIVEQ, TransInfo.trans.number);''

	                    // Chan[chan].FailedCounter++;
	                    // queueEntryPtr = FindPbNodeByTransNum(chan, CF_PB_ACTIVEQ, TransInfo.trans.number);
	                    queueEntryPtr = 0;
	                    if(queueEntryPtr != NULL)
	                    {
	                        queueEntryPtr->Status = TransInfo.final_status;
	                        queueEntryPtr->CondCode = TransInfo.condition_code;
	                    }

	                    // MoveDwnNodeActiveToHistory(TransInfo.trans.number);

	                	InfoEvent( "Outgoing trans %d.%d_%d %s,CondCode %s,Src %s,Ch %d ",
	                                TransInfo.trans.source_id.value[0],
	                                TransInfo.trans.source_id.value[1],
	                                TransInfo.trans.number,
	                                localFinalStatBuf,
	                                localCondCodeBuf,
	                                TransInfo.md.source_file_name,
	                                chan);

	                    /* if trans was aborted before EOF was sent, need to  */
	                    /* start the next file. This could happen via flight-side */
	                    /* abandon or gnd-side cancel */
	                    if(TransInfo.trans.number == Chan[chan].TransNumBlasting)
	                    {
	                    	Chan[chan].DataBlast = CF_NOT_IN_PROGRESS;
	                    	Chan[chan].TransNumBlasting = 0;

	                    //    if(AppData.Tbl->OuCh[Chan].DequeueEnable == ENABLED){
	                    //        StartNextFile(Chan);
	                    //    }/* end if */

	                    }/* end if */
	                } /* end if */

	            }/* end if */

	            break;

	        case IND_ACK_TIMER_EXPIRED:
	        	WarningEvent( "Ack Timer Expired %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_INACTIVITY_TIMER_EXPIRED:
	        	WarningEvent( "Inactivity Timer Expired %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_NAK_TIMER_EXPIRED:
	        	WarningEvent( "Nack Timer Expired %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_SUSPENDED:
	        	WarningEvent( "Transaction Suspended %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_RESUMED:
	        	WarningEvent( "Transaction Resumed %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_REPORT:
	            break;

	        case IND_FAULT:
	        	WarningEvent( "Fault %d,%d.%d_%d,%s",
	                              TransInfo.condition_code,
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);
	            break;

	        case IND_ABANDONED:
	        	WarningEvent( "Indication:Transaction Abandon %d.%d_%d,%s",
	                              TransInfo.trans.source_id.value[0],
	                              TransInfo.trans.source_id.value[1],
	                              TransInfo.trans.number,
	                              &TransInfo.md.source_file_name[0]);

//	            TotalAbandonTrans++;
	            break;

	        default:
	        	ErrorEvent( "Unexpected indication type %d.", IndType);
	            break;

	    }/* end switch */
	}

QueueEntry* FindUpNodeByTransID(uint32_t queue, char *srcEntityID, uint32_t trans)
{
	QueueEntry *qNodePtr;

    qNodePtr = AppData.UpQ[queue].HeadPtr;
    while(qNodePtr != NULL)
    {
        if(qNodePtr->TransNum == trans)
        {
            if(strncmp(srcEntityID, qNodePtr->SrcEntityId, CF_MAX_CFG_VALUE_CHARS) == 0)
                return qNodePtr;
        }
        qNodePtr = qNodePtr->Next;
    }

    return NULL;
}

boolean isPduOutputOpen (ID SourceId, ID DestinationId)
{
    Isolate *isolate = Isolate::GetCurrent();

	const int argc = 1;

	v8::Local<v8::Value> argv[argc];

	argv[0] = Boolean::New(isolate, true);

	Local<Function> Func = Local<Function>::New(isolate, pduOutputOpen.Function);

	if(pduOutputOpen.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);

	}

	return (YES);
}

boolean isPduOutputReady (PDU_TYPE PduType, TRANSACTION TransInfo,ID DestinationId){

    Isolate *isolate = Isolate::GetCurrent();

	const int argc = 1;

	v8::Local<v8::Value> argv[argc];

	argv[0] = Boolean::New(isolate, true);

	Local<Function> Func = Local<Function>::New(isolate, pduOutputReady.Function);

	if(pduOutputReady.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);

	}

	return (YES);
}

void SendPduOutput (TRANSACTION TransInfo,ID DestinationId, CFDP_DATA *PduPtr){

    Isolate *isolate = Isolate::GetCurrent();

	const int argc = 1;
	v8::Local<v8::Value> argv[argc];

	argv[0] = Nan::NewBuffer(PduPtr->content, PduPtr->length).ToLocalChecked();

	Local<Function> Func = Local<Function>::New(isolate, PduOutputSend.Function);

	if(PduOutputSend.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);

	}

}

int32_t Seek(int32_t  filedes, int32_t offset, uint32_t whence)
{

    if(filedes == CF_FD_ZERO_REPLACEMENT)
    {
    	filedes = 0;
    }
    return (fseek((uint32_t)filedes,offset,whence));
}

CF_FILE * FileOpen(const char *Name, const char *Mode){

	FILE	*fileHandle;
	char temp[CF_MAX_PATH_LEN];

	strncpy(temp, AppData.BaseDir, CF_MAX_PATH_LEN);
	strncat(temp, Name, CF_MAX_PATH_LEN);
    fileHandle = fopen(temp, Mode);
    return fileHandle;
}

size_t FileRead(void *Buffer, size_t Size,size_t Count, CF_FILE *File)
{
	size_t out_size = fread(Buffer, Size, Count, File);
	return out_size;
}

size_t FileWrite(const void *Buffer, size_t Size,size_t Count, CF_FILE *File)
{
	size_t out_size = fwrite(Buffer, Size, Count, File);
	return out_size;
}

int FileClose(CF_FILE *File)
{
	return fclose(File);
}

int FileSeek(CF_FILE *File, long int Offset, int Whence)
{
    int     	ReturnVal;
    uint16_t  	WhenceVal;
    int32_t   	SeekVal;

    WhenceVal = 0;
    ReturnVal = OS_SUCCESS;

    if(Whence == SEEK_SET)
    {
        WhenceVal = OS_SEEK_SET;
    }
    else if(Whence == SEEK_CUR)
    {
        WhenceVal = OS_SEEK_CUR;
    }
    else if(Whence == SEEK_END)
    {
        WhenceVal = OS_SEEK_END;
    }

    SeekVal = Seek((int32_t)File,(int32_t)Offset,WhenceVal);

    if(SeekVal == OS_ERROR)
    {
        ReturnVal = 1;
    }
    else
    {
        ReturnVal = OS_SUCCESS;
    }

    return(ReturnVal);
}

int RemoveFile(const char *Name)
{
	char temp[CF_MAX_PATH_LEN];

	strncpy(temp, AppData.BaseDir, CF_MAX_PATH_LEN);
	strncat(temp, Name, CF_MAX_PATH_LEN);
	return remove(temp);
}

int RenameFile(const char *TempFileName, const char *NewName)
{
	char tempOld[CF_MAX_PATH_LEN];
	char tempNew[CF_MAX_PATH_LEN];

	strncpy(tempOld, AppData.BaseDir, CF_MAX_PATH_LEN);
	strncat(tempOld, TempFileName, CF_MAX_PATH_LEN);

	strncat(tempNew, NewName, CF_MAX_PATH_LEN);

	return rename(tempOld, tempNew);
}

u_int_4 FileSize(const char *Name)
{
	struct stat st;
	char temp[CF_MAX_PATH_LEN];

	strncpy(temp, AppData.BaseDir, CF_MAX_PATH_LEN);
	strncat(temp, Name, CF_MAX_PATH_LEN);
	stat(temp, &st);
	return st.st_size;
}

int InfoEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char 			BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t        Status,i;
    Status = 0;
    va_start (ArgPtr, Format);
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
    	  BigBuf[i] = '\0';
          break;
      }
    }

    Isolate *isolate = Isolate::GetCurrent();

	const int argc = 1;
	v8::Local<v8::Value> argv[argc];

	std::string str(BigBuf);
	argv[0] = Nan::New(BigBuf).ToLocalChecked();

	Local<Function> Func = Local<Function>::New(isolate, LogInfo.Function);

	if(LogInfo.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);
		Status = 1;
	}
	else
	{
		printf("INFO : %s\n", &BigBuf);
	}


    return(Status);
}

int ErrorEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char 			BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t        Status,i;
    Status = 0;
    va_start (ArgPtr, Format);
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
    	  BigBuf[i] = '\0';
          break;
      }
    }

    Isolate *isolate = Isolate::GetCurrent();

	const int argc = 1;
	v8::Local<v8::Value> argv[argc];

	std::string str(BigBuf);
	argv[0] = Nan::New(BigBuf).ToLocalChecked();

	Local<Function> Func = Local<Function>::New(isolate, LogError.Function);

	if(LogError.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);
		Status = 1;

	}
	else
	{
		printf("ERR : %s\n", &BigBuf);
	}

    return(Status);
}

int DebugEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char 			BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t        Status,i;
    Status = 0;
    va_start (ArgPtr, Format);
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
    	  BigBuf[i] = '\0';
          break;
      }
    }

    Isolate *isolate = Isolate::GetCurrent();

	const int argc = 1;
	v8::Local<v8::Value> argv[argc];

	std::string str(BigBuf);
	argv[0] = Nan::New(BigBuf).ToLocalChecked();

	Local<Function> Func = Local<Function>::New(isolate, LogDebug.Function);

	if(LogDebug.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);
		Status = 1;
	}
	else
	{
		printf("DEBUG : %s\n", &BigBuf);
	}

    return(Status);
}

int WarningEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char 			BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t        Status,i;
    Status = 0;
    va_start (ArgPtr, Format);
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
    	  BigBuf[i] = '\0';
          break;
      }
    }

    Isolate *isolate = Isolate::GetCurrent();

	const int argc = 1;
	v8::Local<v8::Value> argv[argc];

	std::string str(BigBuf);
	argv[0] = Nan::New(BigBuf).ToLocalChecked();

	Local<Function> Func = Local<Function>::New(isolate, LogWarning.Function);


	if(LogWarning.IsDefined)
	{
		Func->Call(isolate->GetCurrentContext()->Global(), argc, argv);
		Status = 1;

	}
	else
	{
		printf("WARN : %s\n", &BigBuf);
	}

    return(Status);
}

void RegisterCallbacks(){

    register_indication (Indication);
    register_pdu_output_open (isPduOutputOpen);
    register_pdu_output_ready (isPduOutputReady);
    register_pdu_output_send (SendPduOutput);

    register_printf_debug(DebugEvent);
    register_printf_info(InfoEvent);
    register_printf_warning(WarningEvent);
    register_printf_error(ErrorEvent);

    register_file_size(FileSize);
    register_rename(RenameFile);
    register_remove(RemoveFile);
    register_fseek(FileSeek);
    register_fopen(FileOpen);
    register_fread(FileRead);
    register_fwrite(FileWrite);
    register_fclose(FileClose);

}

std::string GetStdString(v8::Local<v8::String> str)
{
	v8::String::Utf8Value temp(str->ToString());
	return(std::string(*temp));
}

void SetCallbackData(CallbackData * cd, Isolate * isolate, v8::Local<v8::Value> val)
{

	cd->Function.Reset(isolate,val.As<Function>());
	cd->IsDefined = true;

}

void GivePdu(const FunctionCallbackInfo<Value> &args)
{
	Isolate* isolate = args.GetIsolate();

	if(args.Length() < 1 || !args[0]->IsObject()) {

	    isolate->ThrowException(Exception::TypeError(
	    String::NewFromUtf8(isolate, "Byte buffer object expected")));
	    return;

	}

	unsigned char* 	buffer 	= (unsigned char*) node::Buffer::Data(args[0]->ToObject());

	memset(&AppData.RawPduInputBuf.content[0], 0, sizeof(AppData.RawPduInputBuf));

	AppData.RawPduInputBuf.length = args[1]->Uint32Value();

	if(AppData.RawPduInputBuf.length > CF_INCOMING_PDU_BUF_SIZE){

		ErrorEvent("PDU Rcv Error:length %d exceeds INCOMING_PDU_BUF_SIZE %d",AppData.RawPduInputBuf.length,CF_INCOMING_PDU_BUF_SIZE);

	}

	memcpy(&AppData.RawPduInputBuf.content[0], buffer, AppData.RawPduInputBuf.length);

	cfdp_give_pdu(AppData.RawPduInputBuf);
}

void RequestPdu(const FunctionCallbackInfo<Value> &args)
{
	char ReqString[MAX_REQUEST_STRING_LENGTH];

	std::string Class 			= GetStdString(args[0]->ToString());
	std::string PeerEntityId 	= GetStdString(args[1]->ToString());
	std::string SrcFilename 	= GetStdString(args[2]->ToString());
	std::string DstFilename 	= GetStdString(args[3]->ToString());

	strcpy(ReqString,"PUT ");
	strcat(ReqString,"-");
	strcat(ReqString,Class.c_str());
	strcat(ReqString," ");
	strcat(&ReqString[0],SrcFilename.c_str());
	strcat(&ReqString[0]," ");
	strcat(&ReqString[0],PeerEntityId.c_str());
	strcat(&ReqString[0]," ");
	strcat(&ReqString[0],DstFilename.c_str());

	if(!cfdp_give_request(ReqString))
	{
        ErrorEvent("Engine put request returned error for %s",SrcFilename.c_str());
	}
	else
	{
		InfoEvent("Engine put request returned success for %s",SrcFilename.c_str());
	}

}

void GetSummaryStatus(const FunctionCallbackInfo<Value> &args)
{
	Isolate* isolate = args.GetIsolate();

	Local<Object> obj = Object::New(isolate);

	SUMMARY_STATUS Summary;

	Summary = cfdp_summary_status();

	obj->Set(String::NewFromUtf8(isolate, "are_any_partners_frozen"),
							Boolean::New(isolate, Summary.are_any_partners_frozen));
	obj->Set(String::NewFromUtf8(isolate, "how_many_senders"),
							Number::New(isolate, Summary.how_many_senders));
	obj->Set(String::NewFromUtf8(isolate, "how_many_receivers"),
							Number::New(isolate, Summary.how_many_receivers));
	obj->Set(String::NewFromUtf8(isolate, "how_many_frozen"),
							Number::New(isolate, Summary.how_many_frozen));
	obj->Set(String::NewFromUtf8(isolate, "how_many_suspended"),
							Number::New(isolate, Summary.are_any_partners_frozen));
	obj->Set(String::NewFromUtf8(isolate, "total_files_sent"),
							Number::New(isolate, Summary.how_many_senders));
	obj->Set(String::NewFromUtf8(isolate, "total_files_received"),
							Number::New(isolate, Summary.how_many_receivers));
	obj->Set(String::NewFromUtf8(isolate, "total_unsuccessful_senders"),
							Number::New(isolate, Summary.how_many_frozen));
	obj->Set(String::NewFromUtf8(isolate, "total_unsuccessful_receivers"),
							Number::New(isolate, Summary.how_many_receivers));


	args.GetReturnValue().Set(obj);
}

void GetIdFromString(const FunctionCallbackInfo<Value> &args)
{
	ID OutId;
	std::string DottedValString = GetStdString(args[0]->ToString());

	if( !cfdp_id_from_string(DottedValString.c_str(), &OutId) )
	{
		ErrorEvent("ID cannot be retrieved for (%s)",DottedValString.c_str());
	}
}

void GetTransactionStatus(const FunctionCallbackInfo<Value> &args)
{

	TRANSACTION Trans;
	TRANS_STATUS * OutTransStatus;

	Trans.number 			= args[0]->NumberValue();
	Trans.source_id.length 	= args[1]->NumberValue();

	unsigned char* 	buffer 	= (unsigned char*) node::Buffer::Data(args[2]->ToObject());

	memset(&Trans.source_id.value[0], 0, sizeof(Trans.source_id.value));
	memcpy(&Trans.source_id.value[0], buffer, Trans.source_id.length);

	if( !cfdp_transaction_status(Trans, OutTransStatus) )
	{
		ErrorEvent("Transaction status cannot be retrieved for Trans# %s",Trans.number);
	}

	Isolate* isolate = args.GetIsolate();

	Local<Object> obj = Object::New(isolate);


	obj->Set(String::NewFromUtf8(isolate, "abandoned"),
							Boolean::New(isolate, OutTransStatus->abandoned));
	obj->Set(String::NewFromUtf8(isolate, "attempts"),
							Number::New(isolate, OutTransStatus->attempts));
	obj->Set(String::NewFromUtf8(isolate, "cancelled"),
							Boolean::New(isolate, OutTransStatus->cancelled));
	obj->Set(String::NewFromUtf8(isolate, "external_file_xfer"),
							Boolean::New(isolate, OutTransStatus->external_file_xfer));
	obj->Set(String::NewFromUtf8(isolate, "fd_offset"),
							Number::New(isolate, OutTransStatus->fd_offset));
	obj->Set(String::NewFromUtf8(isolate, "fd_length"),
							Number::New(isolate, OutTransStatus->fd_length));
	obj->Set(String::NewFromUtf8(isolate, "file_checksum_as_calculated"),
							Number::New(isolate, OutTransStatus->file_checksum_as_calculated));
	obj->Set(String::NewFromUtf8(isolate, "finished"),
							Boolean::New(isolate, OutTransStatus->finished));
	obj->Set(String::NewFromUtf8(isolate, "frozen"),
							Boolean::New(isolate, OutTransStatus->frozen));
	obj->Set(String::NewFromUtf8(isolate, "has_md_been_received"),
							Boolean::New(isolate, OutTransStatus->has_md_been_received));
	obj->Set(String::NewFromUtf8(isolate, "how_many_naks"),
							Number::New(isolate, OutTransStatus->how_many_naks));
	obj->Set(String::NewFromUtf8(isolate, "is_this_trans_solely_for_ack_fin"),
							Boolean::New(isolate, OutTransStatus->is_this_trans_solely_for_ack_fin));
	obj->Set(String::NewFromUtf8(isolate, "phase"),
							Number::New(isolate, OutTransStatus->phase));
	obj->Set(String::NewFromUtf8(isolate, "received_file_size"),
							Number::New(isolate, OutTransStatus->received_file_size));
	obj->Set(String::NewFromUtf8(isolate, "start_time"),
							Number::New(isolate, OutTransStatus->start_time));
	obj->Set(String::NewFromUtf8(isolate, "suspended"),
							Boolean::New(isolate, OutTransStatus->suspended));
	obj->Set(String::NewFromUtf8(isolate, "temp_file_name"),
							String::NewFromUtf8(isolate, OutTransStatus->temp_file_name));


	args.GetReturnValue().Set(obj);

}

void Cycle(const FunctionCallbackInfo<Value> &args)
{

	cfdp_cycle_each_transaction();
}


void RegisterCallbackOn(const FunctionCallbackInfo<Value> &args)
{
	std::string CbIndicator = GetStdString(args[0]->ToString());

	Isolate * isolate = args.GetIsolate();

	if(CbIndicator == "info")
	{
		SetCallbackData(&LogInfo, isolate, args[1]);
	}
	else if(CbIndicator == "debug")
	{
		SetCallbackData(&LogDebug, isolate, args[1]);
	}
	else if(CbIndicator == "error")
	{
		SetCallbackData(&LogError, isolate, args[1]);
	}
	else if(CbIndicator == "warning")
	{
		SetCallbackData(&LogWarning, isolate, args[1]);
	}
	else if(CbIndicator == "pduOutputOpen")
	{
		SetCallbackData(&pduOutputOpen, isolate, args[1]);
	}
	else if(CbIndicator == "pduOutputReady")
	{
		SetCallbackData(&pduOutputReady, isolate, args[1]);
	}
	else if(CbIndicator == "pduOutputSend")
	{
		SetCallbackData(&PduOutputSend, isolate, args[1]);
	}

}


void SetConfig(const FunctionCallbackInfo<Value> &args)
{
	Isolate* isolate = args.GetIsolate();

	if(args.Length() < 1 || !args[0]->IsObject()) {

	    isolate->ThrowException(Exception::TypeError(
	    String::NewFromUtf8(isolate, "Config object expected")));
	    return;

	}

	Local<Context> 	context = 	isolate->GetCurrentContext();
	Local<Object> 	obj 	= 	args[0]->ToObject(context).ToLocalChecked();
	Local<Array> 	props 	= 	obj->GetOwnPropertyNames(context).ToLocalChecked();

  for(int i = 0, l = props->Length(); i < l; i++) {

	Local<Value> localKey = props->Get(i);
	Local<Value> localVal = obj->Get(context, localKey).ToLocalChecked();

	std::string key = GetStdString(localKey->ToString());
	std::string val = GetStdString(localVal->ToString());

	if ( key == "TEMP_BASE_DIR")
	{

		Config.TempBaseDir = val.c_str ();

	}
	else if (key =="TEMP_FILE_NAME_PREFIX")
	{
		Config.TempFileNamePrefix = val.c_str ();

	}

  }

}

void SetMibParams(const FunctionCallbackInfo<Value> &args)
{

	Isolate* isolate = args.GetIsolate();

	if(args.Length() < 1 || args.Length() > 2 || !args[0]->IsString() || !args[1]->IsString()) {

	    isolate->ThrowException(Exception::TypeError(
	    String::NewFromUtf8(isolate, "Key-Value pair expected")));
	    return;

	  }

	std::string str_key = GetStdString(args[0]->ToString());
	std::string str_val = GetStdString(args[1]->ToString());

	cfdp_set_mib_parameter (str_key.c_str (), str_val.c_str ());

}

void AppInit(const FunctionCallbackInfo<Value> &args)
{

	/* Set temp base directory */
    strncpy(AppData.BaseDir, Config.TempBaseDir, CF_MAX_PATH_LEN);

    /* Register all callbacks */
	RegisterCallbacks();

}

void Initialize(Local<Object> exports)
{

	NODE_SET_METHOD(exports, "AppInit", AppInit);

	NODE_SET_METHOD(exports, "SetMibParams", SetMibParams);

	NODE_SET_METHOD(exports, "SetConfig", SetConfig);

	NODE_SET_METHOD(exports, "RegisterCallbackOn", RegisterCallbackOn);

	NODE_SET_METHOD(exports, "GivePdu", GivePdu);

	NODE_SET_METHOD(exports, "RequestPdu", RequestPdu);

	NODE_SET_METHOD(exports, "GetSummaryStatus", GetSummaryStatus);

	NODE_SET_METHOD(exports, "GetIdFromString", GetIdFromString);

	NODE_SET_METHOD(exports, "GetTransactionStatus", GetTransactionStatus);

	NODE_SET_METHOD(exports, "Cycle", Cycle);


}

NODE_MODULE(addon, Initialize);
