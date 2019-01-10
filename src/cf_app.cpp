#include <nan.h>
#include <fstream>
#include <iostream>
#include <string>
#include <typeinfo>
#include <stdarg.h>

#include "cf_app.h"


int CF_TableInit (){
	return SUCCESS;
}

int CF_ChannelInit(){
	return SUCCESS;
}

int CF_RegisterCallbacks(){
	return SUCCESS;
}

boolean CF_PduOutputOpen (ID SourceId, ID DestinationId)
{
   return (YES);
}

int32_t CF_Tmpopen(const char *path,  int32_t access,  uint32_t mode)
{

    int32_t fd;

    fd = open(path,access,mode);

    if(fd == 0)
    {
    	fd = CF_FD_ZERO_REPLACEMENT;
    }

    return fd;

}

int32_t CF_Tmpcreat(const char *path, int32_t  access)
{

    int32_t fd;

    fd = creat(path,access);
    if(fd == 0)
    {
    	fd = CF_FD_ZERO_REPLACEMENT;
    }

    return fd;

}

int32_t CF_Tmpclose(int32_t  filedes)
{
    if(filedes == CF_FD_ZERO_REPLACEMENT)
    {
    	filedes = 0;
    }

    return (close(filedes));
}

int32_t  CF_Tmpread(int32_t  filedes, void *buffer, uint32_t nbytes)
{

    if(filedes == CF_FD_ZERO_REPLACEMENT)
    {
    	filedes = 0;
    }
    return (read(filedes,buffer,nbytes));

}

int32_t CF_Tmpwrite(int32_t  filedes, void *buffer, uint32_t nbytes)
{
    if(filedes == CF_FD_ZERO_REPLACEMENT)
    {
    	filedes = 0;
    }
    return(write(filedes,buffer,nbytes));
}

int32_t  CF_Tmplseek(int32_t  filedes, int32_t offset, uint32_t whence)
{

    if(filedes == CF_FD_ZERO_REPLACEMENT)
    {
    	filedes = 0;
    }
    return (lseek((uint32_t)filedes,offset,whence));
}

CFDP_FILE * CF_Fopen(const char *Name, const char *Mode){

	int32_t FileHandle;

    if(((strcmp(Mode,"r")) == 0) || ((strcmp(Mode,"rb")) == 0))
    {
        if((FileHandle = CF_Tmpopen(Name,OS_READ_ONLY,0)) < OS_SUCCESS)
        {
            FileHandle = 0;
        }

    }
    else if(((strcmp(Mode,"rw")) == 0) || ((strcmp(Mode,"rwb")) == 0))
    {
        if((FileHandle = CF_Tmpopen(Name,OS_READ_WRITE,0)) < OS_SUCCESS)
        {
            FileHandle = 0;
        }
    }
    else if(((strcmp(Mode,"w")) == 0) || ((strcmp(Mode,"wb")) == 0))
    {

        if((FileHandle = CF_Tmpcreat(Name,OS_READ_WRITE)) < OS_SUCCESS)
        {
            FileHandle = 0;
        }
    }
    else
    {
        if((FileHandle = CF_Tmpopen(Name,OS_READ_WRITE,0)) < OS_SUCCESS)
        {
            FileHandle = 0;
        }
    }

    return((CFDP_FILE *)FileHandle);
}

size_t CF_Fread(void *Buffer, size_t Size,size_t Count, CFDP_FILE *File)
{
    int32_t BytesRead;
    int32_t ReturnCount;

    if((Size == 0) || (Count == 0))
    {
       ReturnCount = 0;
    }
    else
    {

       BytesRead = CF_Tmpread((uint32_t)File,Buffer,(uint32_t)(Size*Count));
       if(BytesRead <= 0)
       {
          ReturnCount = 0;
       }
       else
       {
          ReturnCount = BytesRead/Size;
       }
    }

   return(ReturnCount);
}

size_t CF_Fwrite(const void *Buffer, size_t Size,size_t Count, CFDP_FILE *File)
{
    int32_t BytesWritten;
    int32_t ReturnCount;

    if((Size == 0) || (Count == 0))
    {
       ReturnCount = 0;
    }
    else
    {
       BytesWritten = CF_Tmpwrite((uint32_t)File,(void*)Buffer,(uint32_t)(Size*Count));
       if(BytesWritten <= 0)
       {
          ReturnCount = 0;
       }
       else
       {
          ReturnCount = BytesWritten/Size;
       }
    }

   return(ReturnCount);
}

int CF_Fclose(CFDP_FILE *File)
{
    int32_t  CloseVal;

    CloseVal = CF_Tmpclose((uint32_t)File);

    if(CloseVal != OS_SUCCESS)
    {
        printf("Could not close file from callback function! OS_close Val = %d",CloseVal);
    }

    return((int)CloseVal);
}

int CF_Fseek(CFDP_FILE *File, long int Offset, int Whence)
{
    int     	ReturnVal;
    uint16_t  	WhenceVal;
    int32_t   	SeekVal;

    WhenceVal = 0;
    ReturnVal = OS_SUCCESS;

    if(Whence == SEEK_SET)
    {
        WhenceVal = OS_SEEK_SET;
    }else if(Whence == SEEK_CUR)
    {
        WhenceVal = OS_SEEK_CUR;
    }else if(Whence == SEEK_END)
    {
        WhenceVal = OS_SEEK_END;
    }

    SeekVal = CF_Tmplseek((int32_t)File,(int32_t)Offset,WhenceVal);

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

int CF_RemoveFile(const char *Name)
{
    int32_t Status;

    Status = 0;

    if((remove(Name)) != OS_SUCCESS)
    {
        printf("Could not remove file %s in remove callback",Name);
        Status = 1;
    }


    return(Status);
}

int CF_RenameFile(const char *TempFileName, const char *NewName)
{
    int32_t    OldFd,NewFd,Status;
    uint32_t   NumReadFromOld,NumWrittenToNew;
    int32_t    FileStorage[CF_RENAME_BUF];

    OldFd = 0;
    NewFd = 0;
    Status = 0;

    memset(&FileStorage[0],'\0',CF_RENAME_BUF);

    if((OldFd = open(TempFileName,OS_READ_WRITE,0)) < OS_SUCCESS)
    {
        printf("Unable to open file = %s!",TempFileName);
        Status = 1;
    }

    if((NewFd = creat(NewName,OS_READ_WRITE)) < OS_SUCCESS)
    {
        printf("Unable to create file = %s!",NewName);
        Status = 1;
    }


    if(Status != 1)
    {
        while((NumReadFromOld = read(OldFd,(void*)&FileStorage[0],CF_RENAME_BUF)) != OS_SUCCESS)
        {
            if((NumWrittenToNew = write(NewFd,(void*)&FileStorage[0],NumReadFromOld)) != NumReadFromOld)
            {
                printf("File write error! Should have written  = %d bytes but only wrote %d bytes to the file!", NumReadFromOld,NumWrittenToNew);
                Status = 1;
            }

            memset(&FileStorage[0],'\0',CF_RENAME_BUF);
        }

        close(OldFd);
        close(NewFd);

        if((remove(TempFileName)) != OS_SUCCESS)
        {
            printf("Could not remove file %s in rename callback.",TempFileName);
            Status = 1;
        }
    }

    return(Status);
}

u_int_4 CF_FileSize(const char *Name)
{
    os_fstat_t          OsStatBuf;
    int32_t               StatVal;
    uint32_t             FileSize;

    FileSize = 0;

    StatVal = stat(Name,&OsStatBuf);
    if(StatVal >= OS_SUCCESS)
    {
        FileSize = OsStatBuf.st_size;
    }
    else
    {
        printf("The file %s size could not be retrieved because it does not exist.",Name);
    }

    return(FileSize);
}

int CF_ErrorEvent(const char *Format, ...)
{
//    va_list         ArgPtr;
//    char            BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
//    uint32_t          Status,i;
//
//    va_start (ArgPtr, Format);
    printf("Test");
    printf("ERR: ");
//    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
//    va_end (ArgPtr);
//
//    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
//      if(BigBuf[i] == '\n'){
//          BigBuf[i] = '\0';
//          break;
//      }
//    }
//    printf("ERR: ");
//    printf(BigBuf);
//    printf("\n");
//
//    return(Status);

}

int CF_DebugEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char            BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t          Status,i;

    va_start (ArgPtr, Format);
    printf("Test");
    printf("DEB: ");
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
          BigBuf[i] = '\0';
          break;
      }
    }
    printf("**DEBUG: ");
    printf(BigBuf);
    printf("\n");

    return(Status);

}

int CF_InfoEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char            BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t          Status,i;

    va_start (ArgPtr, Format);

    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
          BigBuf[i] = '\0';
          break;
      }
    }
    printf("INFO: ");
    printf(BigBuf);
    printf("\n");

    return(Status);

}

int CF_WarningEvent(const char *Format, ...)
{
    va_list         ArgPtr;
    char            BigBuf[CFE_EVS_MAX_MESSAGE_LENGTH];
    uint32_t          Status,i;

    va_start (ArgPtr, Format);
    printf("Test");
    printf("WAR: ");
    vsnprintf(BigBuf,CFE_EVS_MAX_MESSAGE_LENGTH,Format,ArgPtr);
    va_end (ArgPtr);

    for (i=0;i<CFE_EVS_MAX_MESSAGE_LENGTH;i++){
      if(BigBuf[i] == '\n'){
          BigBuf[i] = '\0';
          break;
      }
    }
    printf("WAR: ");
    printf(BigBuf);
    printf("\n");

    return(Status);

}
void CF_Indication (INDICATION_TYPE IndType, TRANS_STATUS TransInfo){
	printf("CF_INDICATION\n");
}

boolean CF_PduOutputReady (PDU_TYPE PduType, TRANSACTION TransInfo,ID DestinationId){
	printf("CF_PduOutputReady\n");
	return (YES);

}

void CF_PduOutputSend (TRANSACTION TransInfo,ID DestinationId, CFDP_DATA *PduPtr){
	printf("CF_IPduOutputsend\n");

}


int CF_SetMibParams(){

	int i;
	int j;

	for( i = 0; i < CF_NUM_UPLINK_QUEUES; i++ ){
		AppData.UpQ[i].HeadPtr  =  NULL;
		AppData.UpQ[i].TailPtr  =  NULL;
		AppData.UpQ[i].EntryCnt  = 0;
	}

    register_indication (CF_Indication);
    register_pdu_output_open (CF_PduOutputOpen);
    register_pdu_output_ready (CF_PduOutputReady);
    register_pdu_output_send (CF_PduOutputSend);
    register_printf_debug(CF_DebugEvent);
    register_printf_info(CF_InfoEvent);
    register_printf_warning(CF_WarningEvent);
    register_printf_error(CF_ErrorEvent);
    register_file_size(CF_FileSize);
    register_rename(CF_RenameFile);
    register_remove(CF_RemoveFile);
    register_fseek(CF_Fseek);
    register_fopen(CF_Fopen);
    register_fread(CF_Fread);
    register_fwrite(CF_Fwrite);
    register_fclose(CF_Fclose);

    for( i = 0; i < CF_MAX_PLAYBACK_CHANNELS; i++ ){

    	AppData.Chan[i].DataBlast = 0;
    	AppData.Chan[i].PendQTimer       = 0;
    	AppData.Chan[i].PollDirTimer     = 0;
    	AppData.Chan[i].TransNumBlasting = 0;

    	for( j = 0; j < CF_QUEUES_PER_CHAN; j++ ){
    			AppData.Chan[i].PbQ[j].HeadPtr  =  NULL;
    			AppData.Chan[i].PbQ[j].TailPtr  =  NULL;
    			AppData.Chan[i].PbQ[j].EntryCnt  = 0;
    		}
    }



    cfdp_set_mib_parameter ("ACK_TIMEOUT", "10");
    cfdp_set_mib_parameter ("ACK_LIMIT", "2");
    cfdp_set_mib_parameter ("NAK_TIMEOUT", "5");
    cfdp_set_mib_parameter ("NAK_LIMIT", "3");
    cfdp_set_mib_parameter ("INACTIVITY_TIMEOUT", "20");
    cfdp_set_mib_parameter ("OUTGOING_FILE_CHUNK_SIZE", "64");
    cfdp_set_mib_parameter ("SAVE_INCOMPLETE_FILES", "no");
//    cfdp_set_mib_parameter ("MY_ID","0.22");


    unsigned char test[] = {0x04, 0x00, 0x31, 0x13, 0x00, 0x18, 0x00, 0x00, 0x00, 0x01, 0x00, 0x17, 0x07, 0x80, 0x00, 0x00, 0x00, 0x0d, 0x16, 0x2f, 0x63, 0x66, 0x2f, 0x64, 0x6f, 0x77, 0x6e, 0x6c, 0x6f, 0x61, 0x64, 0x2f, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x2e, 0x74, 0x78, 0x74, 0x13, 0x63, 0x66, 0x74, 0x65, 0x73, 0x74, 0x69, 0x6e, 0x67, 0x2f, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x2e, 0x74, 0x78, 0x74};

    //unsigned char test[] = {0x00, 0x18, 0x00, 0x00, 0x00, 0x01, 0x00, 0x17, 0x00, 0x00, 0x00, 0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x21, 0x0a};

    uint8_t          *IncomingPduPtr;
    CF_PDU_Hdr_t     *PduHdrPtr;
    uint8_t          EntityIdBytes,TransSeqBytes,PduHdrBytes;
    uint8_t          *PduDataPtr;
    //IncomingPduPtr = &test[0];

//    unsigned char msgId = ((test[0] << 8) + test[1]);
//    uint32_t pktType = CFE_TST(msgId,12);
//
//	printf(" Msg ID       %d\n", msgId);
//	printf(" Pkt Type     %d\n", pktType);
//
//	if( pktType == 1){
//		// CMD
//		IncomingPduPtr += CFE_SB_CMD_HDR_SIZE;
//	}else{
//		//TLM
//		IncomingPduPtr += CFE_SB_TLM_HDR_SIZE;
//	}
//
//	printf(" Start Byte       %p\n", IncomingPduPtr);
//
//	PduHdrPtr = (CF_PDU_Hdr_t *)IncomingPduPtr;
//
//	printf(" Octet1       		%d\n", PduHdrPtr->Octet1);
//	printf(" PDataLen       	%d\n", PduHdrPtr->PDataLen);
//	printf(" Octet4       		%d\n", PduHdrPtr->Octet4);
//	printf(" SrcEntityId        %d\n", PduHdrPtr->SrcEntityId);
//	printf(" TransSeqNum        %d\n", PduHdrPtr->TransSeqNum);
//	printf(" DstEntityId        %d\n", PduHdrPtr->DstEntityId);
//
//    /* calculate size of incoming pdu to ensure we don't overflow the buf */
//    EntityIdBytes = ((PduHdrPtr->Octet4 >> 4) & 0x07) + 1;
//    TransSeqBytes = (PduHdrPtr->Octet4 & 0x07) + 1;
//    PduHdrBytes = CF_PDUHDR_FIXED_FIELD_BYTES + (EntityIdBytes * 2) + TransSeqBytes;
//
//	printf(" EntityIdBytes        %d\n", EntityIdBytes);
//	printf(" TransSeqBytes        %d\n", TransSeqBytes);
//	printf(" PduHdrBytes          %d\n", PduHdrBytes);
//
//    if(PduHdrBytes != CF_PDU_HDR_BYTES){
//		printf("PDU Rcv Error:PDU Hdr illegal size - %d, must be %d bytes",PduHdrBytes,CF_PDU_HDR_BYTES);
//	}
//
//    if(CFE_TST(PduHdrPtr->Octet1,4)){
//        printf("CF:Received File Data PDU,len=%d\n", PduHdrPtr->PDataLen + PduHdrBytes);
//    }else{
//
//        printf("CF:Received ");
//        printf(" PDU,len=%d\n", PduHdrPtr->PDataLen + PduHdrBytes);
//    }

    AppData.RawPduInputBuf.length = sizeof(test);

    if(AppData.RawPduInputBuf.length > CF_INCOMING_PDU_BUF_SIZE){
    	printf("PDU Rcv Error:length %d exceeds CF_INCOMING_PDU_BUF_SIZE %d",AppData.RawPduInputBuf.length,CF_INCOMING_PDU_BUF_SIZE);
	}

    memcpy(&AppData.RawPduInputBuf.content[0], test, AppData.RawPduInputBuf.length);


    for(j = 0; j < AppData.RawPduInputBuf.length; j++){
    	printf("[%d]-%d | ",j,AppData.RawPduInputBuf.content[j]);
    }
    cfdp_give_pdu(AppData.RawPduInputBuf);
    cfdp_cycle_each_transaction();

    return SUCCESS;
}





NAN_METHOD(CF_AppInit) {



	int Status = SUCCESS;

	Status = CF_TableInit();
	if(!Status){
		printf("Table Initialization Failed\n");
		return;
	}

	Status = CF_SetMibParams();
	if(!Status){
		printf("MIB Parameters Not Set Properly\n");
		return;
	}

	Status = CF_RegisterCallbacks();
	if(!Status){
		printf("Callback Registration Failed\n");
		return;
	}
	Status = CF_ChannelInit();
	if(!Status){
		printf("Channel Initialization Failed\n");
		return;
	}

}

NAN_METHOD(RegisterCallbackOn) {

	v8::Local<v8::String> 	cbIndicator = v8::Local<v8::String>::Cast(info[0]);
	v8::Local<v8::Function>  cbFunc 		= v8::Local<v8::Function>::Cast(info[1]);
//	Nan::Callback cb(cbFunc);
//	printf("is Function %d ",info[1].IsArray());

//	Nan::Maybe<int> *function = Nan::To<int> * (info[1]);
	register_printf_info(cbFunc);
//	Nan::Callback cb(cbFunc);

//	switch(cbIndicator){
//
//	case 'info':
//		printf("%x \n",&cbFunc);
//	case 'debug':
//		printf("%x \n",&cbFunc);
//	case 'error':
//		printf("%x \n",&cbFunc);
//	case 'warning':
//		printf("%x \n",&cbFunc);
//	default:
//		printf("Unknown Indicator received.");
//		break;
//
//	}



//	v8::Local<v8::Value> args[argc];
//	args[0] = Nan::New("test").ToLocalChecked();
//
//	v8::Local<v8::Value> jsReturnValue1 = cb.Call(1, args);





}

NAN_MODULE_INIT(Initialize) {
    NAN_EXPORT(target, CF_AppInit);
    NAN_EXPORT(target, RegisterCallbackOn);
}

NODE_MODULE(addon, Initialize);
