<script lang="ts" setup>
import type { UploadFile } from 'ant-design-vue';
import type { UploadRequestOption } from 'ant-design-vue/lib/vc-upload/interface';

import type { MallMerchantApi } from '#/api/mall/product/merchant';
import type { MerchantApplicationTerms } from '#/api/mall/product/merchant/application-contract';

import { computed, onMounted, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button as AButton,
  Checkbox as ACheckbox,
  Descriptions as ADescriptions,
  DescriptionsItem as ADescriptionsItem,
  Empty as AEmpty,
  FormItem as AFormItem,
  Input as AInput,
  Result as AResult,
  Select as ASelect,
  Steps as ASteps,
  Tag as ATag,
  Timeline as ATimeline,
  TimelineItem as ATimelineItem,
  Upload as AUpload,
  message,
  Upload,
} from 'ant-design-vue';

import {
  getMerchantApplicationHistory,
  getMerchantApplicationMine,
  getMerchantApplicationTerms,
  getMerchantBusinessTypeList,
  saveMerchantApplicationDraft,
  submitMerchantApplication,
  uploadMerchantQualification,
} from '#/api/mall/product/merchant';
import { MerchantStatus } from '#/api/mall/product/merchant';
import {
  buildMerchantApplicationDraft,
  buildMerchantApplicationSubmission,
  mergeBusinessTypeRequirements,
} from '#/api/mall/product/merchant/application-contract';
import { useAuthStore } from '#/store';

const statusMap: Record<number, { color: string; label: string }> = {
  [MerchantStatus.DRAFT]: { color: 'default', label: '草稿' },
  [MerchantStatus.PENDING]: { color: 'processing', label: '审核中' },
  [MerchantStatus.APPROVED]: { color: 'success', label: '已通过' },
  [MerchantStatus.REJECTED]: { color: 'error', label: '需补充材料' },
  [MerchantStatus.FROZEN]: { color: 'warning', label: '已暂停' },
  [MerchantStatus.CHANGE_PENDING]: {
    color: 'processing',
    label: '资料变更审核中',
  },
  [MerchantStatus.CHANGE_REJECTED]: { color: 'error', label: '资料变更被退回' },
};

const loading = ref(false);
const saving = ref(false);
const currentStep = ref(0);
const confirmed = ref(false);
const changeMode = ref(false);
const applicationLoadFailed = ref(false);
const businessTypes = ref<MallMerchantApi.BusinessType[]>([]);
const history = ref<MallMerchantApi.Application[]>([]);
const terms = ref<MerchantApplicationTerms>({ available: false });
const application = reactive<MallMerchantApi.Application>({
  name: '',
  storeName: '',
  companyName: '',
  creditCode: '',
  legalPerson: '',
  contactName: '',
  contactMobile: '',
  businessTypes: [],
  qualifications: [],
});

const editable = computed(
  () =>
    changeMode.value ||
    [MerchantStatus.DRAFT, MerchantStatus.REJECTED].some(
      (status) =>
        status ===
        (application.type === 'LEGACY'
          ? application.merchantStatus
          : (application.status ?? 0)),
    ),
);
const status = computed(
  () =>
    statusMap[application.merchantStatus ?? application.status ?? 0] ?? {
      color: 'default',
      label: '未提交',
    },
);
const effectiveStatus = computed(
  () => application.merchantStatus ?? MerchantStatus.DRAFT,
);
const selectedBusinessTypes = computed(() =>
  businessTypes.value.filter((type) =>
    application.businessTypes.includes(type.code),
  ),
);
const requirements = computed(() =>
  mergeBusinessTypeRequirements(selectedBusinessTypes.value),
);

watch(
  requirements,
  (items) => {
    for (const requirement of items) {
      if (
        !application.qualifications.some(
          (item) => item.code === requirement.code,
        )
      ) {
        application.qualifications.push({
          code: requirement.code,
          name: requirement.name,
        });
      }
    }
  },
  { immediate: true },
);

async function load() {
  loading.value = true;
  try {
    const [mineResult, typesResult, recordsResult, termsResult] =
      await Promise.allSettled([
        getMerchantApplicationMine(),
        getMerchantBusinessTypeList(),
        getMerchantApplicationHistory(),
        getMerchantApplicationTerms(),
      ]);
    if (typesResult.status === 'fulfilled') {
      businessTypes.value = typesResult.value;
    } else {
      message.error('经营类型加载失败，请稍后重试');
    }
    if (mineResult.status === 'fulfilled' && mineResult.value) {
      Object.assign(application, mineResult.value);
      applicationLoadFailed.value = false;
    } else {
      applicationLoadFailed.value = mineResult.status === 'rejected';
    }
    history.value =
      recordsResult.status === 'fulfilled' ? recordsResult.value : [];
    terms.value =
      termsResult.status === 'fulfilled'
        ? termsResult.value
        : { available: false };
    changeMode.value = false;
    if (mineResult.status === 'fulfilled') {
      await useAuthStore().refreshMerchantAccess();
    }
  } finally {
    loading.value = false;
  }
}

function startChangeApplication() {
  changeMode.value = true;
  confirmed.value = false;
  currentStep.value = 0;
}

async function saveDraft(showMessage = true) {
  if (!editable.value) return false;
  saving.value = true;
  try {
    const activeRequirementCodes = new Set(
      requirements.value.map((item) => item.code),
    );
    await saveMerchantApplicationDraft(
      buildMerchantApplicationDraft(application, activeRequirementCodes),
    );
    if (
      application.merchantStatus === MerchantStatus.APPROVED ||
      changeMode.value
    ) {
      application.type = 'CHANGE';
    }
    application.status = MerchantStatus.DRAFT;
    changeMode.value = false;
    if (showMessage) message.success('草稿已保存');
    return true;
  } finally {
    saving.value = false;
  }
}

function validateStep(step: number) {
  if (step === 0) {
    const requiredFields = [
      application.name,
      application.storeName,
      application.companyName,
      application.creditCode,
      application.legalPerson,
      application.contactName,
      application.contactMobile,
    ];
    if (requiredFields.some((value) => !value?.trim())) {
      message.warning('请补全主体及联系人信息');
      return false;
    }
  }
  if (step === 1) {
    if (application.businessTypes.length === 0) {
      message.warning('请选择经营类型');
      return false;
    }
    const missing = requirements.value.find((requirement) => {
      const qualification = application.qualifications.find(
        (item) => item.code === requirement.code,
      );
      const provided = Boolean(
        qualification?.fileId ||
        qualification?.certificateNo?.trim() ||
        qualification?.validStart ||
        qualification?.validEnd,
      );
      if (!requirement.required && !provided) return false;
      return (
        !qualification?.fileId ||
        (requirement.certificateNoRequired && !qualification?.certificateNo) ||
        (requirement.validityRequired &&
          (!qualification?.validStart || !qualification.validEnd))
      );
    });
    if (missing) {
      message.warning(`请补充${missing.name}所需材料`);
      return false;
    }
  }
  return true;
}

function goNext() {
  if (validateStep(currentStep.value)) currentStep.value += 1;
}

async function handleSubmit() {
  if (!validateStep(0)) {
    currentStep.value = 0;
    return;
  }
  if (!validateStep(1)) {
    currentStep.value = 1;
    return;
  }
  if (!confirmed.value) {
    message.warning('请确认提交信息真实有效');
    return;
  }
  if (!terms.value.available) {
    message.error('平台尚未配置正式商家协议和隐私政策，暂不能提交申请');
    return;
  }
  const saved = await saveDraft(false);
  if (!saved) return;
  saving.value = true;
  try {
    await submitMerchantApplication(
      buildMerchantApplicationSubmission(confirmed.value, terms.value),
    );
    application.status = MerchantStatus.PENDING;
    currentStep.value = 0;
    confirmed.value = false;
    message.success('申请已提交');
    await load();
  } finally {
    saving.value = false;
  }
}

function getQualification(code: string) {
  return application.qualifications.find((item) => item.code === code);
}

function getUploadFileList(code: string): UploadFile[] {
  const item = getQualification(code);
  if (!item?.fileId) return [];
  return [
    {
      uid: String(item.fileId),
      name: item.fileName || '已上传材料',
      status: 'done',
      url: item.previewUrl,
    },
  ];
}

function getUploadHandler(
  requirement: MallMerchantApi.QualificationRequirement,
) {
  return (option: UploadRequestOption) => handleUpload(option, requirement);
}

function beforeUpload(file: File) {
  const allowedType = /\.(pdf|png|jpe?g)$/i.test(file.name);
  if (!allowedType) {
    message.error('仅支持 PDF、PNG 或 JPG 文件');
    return Upload.LIST_IGNORE;
  }
  if (file.size > 20 * 1024 * 1024) {
    message.error('文件大小不能超过 20MB');
    return Upload.LIST_IGNORE;
  }
  return true;
}

async function handleUpload(
  option: UploadRequestOption,
  requirement: MallMerchantApi.QualificationRequirement,
) {
  try {
    const uploaded = await uploadMerchantQualification(option.file as File);
    const current = getQualification(requirement.code);
    if (current) {
      current.fileId = uploaded.fileId;
      current.fileName = (option.file as File).name;
      current.previewUrl = uploaded.previewUrl;
    }
    option.onSuccess?.(uploaded);
    message.success(`${requirement.name}已上传`);
  } catch (error) {
    option.onError?.(error as Error);
  }
}

function removeQualificationFile(code: string) {
  const item = getQualification(code);
  if (item) {
    item.fileId = undefined;
    item.fileName = undefined;
    item.previewUrl = undefined;
  }
  return true;
}

function formatTime(value?: Date | string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

onMounted(load);
</script>

<template>
  <Page auto-content-height>
    <div class="merchant-workbench" :aria-busy="loading">
      <section class="status-row">
        <div>
          <h1>商家入驻申请</h1>
          <p
            v-if="application.status === MerchantStatus.REJECTED"
            class="review-message"
          >
            {{ application.rejectReason || '请按审核意见补充材料后重新提交。' }}
          </p>
          <p v-else-if="applicationLoadFailed" class="review-message">
            尚无可读取的申请记录；填写资料并保存草稿即可开始申请。
          </p>
          <p v-else class="status-note">
            {{
              application.status === MerchantStatus.APPROVED
                ? '入驻资料已通过审核。'
                : '完善经营主体和资质信息，提交后等待平台审核。'
            }}
          </p>
        </div>
        <ATag :color="status.color">{{ status.label }}</ATag>
      </section>

      <section v-if="editable" class="application-section">
        <div v-if="changeMode" class="change-notice">
          变更申请审核通过前，商品、品牌、履约和售后页面会受限。
        </div>
        <ASteps
          :current="currentStep"
          :items="[
            { title: '主体信息' },
            { title: '经营范围与资质' },
            { title: '确认提交' },
          ]"
        />

        <div v-if="currentStep === 0" class="form-grid">
          <AFormItem label="商家名称" required>
            <AInput
              v-model:value="application.name"
              placeholder="请输入商家名称"
            />
          </AFormItem>
          <AFormItem label="店铺名称" required>
            <AInput
              v-model:value="application.storeName"
              placeholder="请输入店铺名称"
            />
          </AFormItem>
          <AFormItem label="企业主体" required>
            <AInput
              v-model:value="application.companyName"
              placeholder="请输入营业执照上的企业名称"
            />
          </AFormItem>
          <AFormItem label="统一社会信用代码" required>
            <AInput
              v-model:value="application.creditCode"
              placeholder="请输入统一社会信用代码"
            />
          </AFormItem>
          <AFormItem label="法人代表" required>
            <AInput
              v-model:value="application.legalPerson"
              placeholder="请输入法人姓名"
            />
          </AFormItem>
          <AFormItem label="联系人" required>
            <AInput
              v-model:value="application.contactName"
              placeholder="请输入联系人姓名"
            />
          </AFormItem>
          <AFormItem label="联系电话" required>
            <AInput
              v-model:value="application.contactMobile"
              placeholder="请输入联系电话"
            />
          </AFormItem>
        </div>

        <div v-else-if="currentStep === 1" class="qualification-section">
          <AFormItem label="经营类型" required>
            <ASelect
              v-model:value="application.businessTypes"
              mode="multiple"
              :options="
                businessTypes.map((item) => ({
                  label: item.name,
                  value: item.code,
                }))
              "
              placeholder="选择一个或多个经营类型"
              :disabled="!editable"
            />
          </AFormItem>
          <AEmpty
            v-if="application.businessTypes.length === 0"
            description="选择经营类型后查看对应资质要求"
          />
          <div
            v-for="requirement in requirements"
            :key="requirement.code"
            class="qualification-row"
          >
            <div class="qualification-title">
              <strong>{{ requirement.name }}</strong>
              <ATag v-if="requirement.required" color="red">必需</ATag>
            </div>
            <div class="qualification-fields">
              <AFormItem
                v-if="
                  requirement.certificateNoRequired ||
                  getQualification(requirement.code)?.certificateNo
                "
                label="证件编号"
              >
                <AInput
                  v-model:value="
                    getQualification(requirement.code)!.certificateNo
                  "
                  placeholder="请输入证件编号"
                />
              </AFormItem>
              <AFormItem label="资质文件" :required="requirement.required">
                <AUpload
                  accept=".pdf,.png,.jpg,.jpeg"
                  :before-upload="beforeUpload"
                  :custom-request="getUploadHandler(requirement)"
                  :file-list="getUploadFileList(requirement.code)"
                  :max-count="1"
                  @remove="removeQualificationFile(requirement.code)"
                >
                  <AButton :disabled="!editable">上传文件</AButton>
                </AUpload>
              </AFormItem>
              <template v-if="requirement.validityRequired">
                <AFormItem label="有效期开始" required>
                  <AInput
                    v-model:value="
                      getQualification(requirement.code)!.validStart
                    "
                    type="date"
                  />
                </AFormItem>
                <AFormItem label="有效期结束" required>
                  <AInput
                    v-model:value="getQualification(requirement.code)!.validEnd"
                    type="date"
                  />
                </AFormItem>
              </template>
            </div>
          </div>
        </div>

        <div v-else class="confirm-section">
          <ADescriptions bordered :column="2" size="small">
            <ADescriptionsItem label="商家名称">
              {{ application.name || '-' }}
            </ADescriptionsItem>
            <ADescriptionsItem label="店铺名称">
              {{ application.storeName || '-' }}
            </ADescriptionsItem>
            <ADescriptionsItem label="企业主体">
              {{ application.companyName || '-' }}
            </ADescriptionsItem>
            <ADescriptionsItem label="统一社会信用代码">
              {{ application.creditCode || '-' }}
            </ADescriptionsItem>
            <ADescriptionsItem label="联系人">
              {{ application.contactName || '-' }}
              {{ application.contactMobile || '' }}
            </ADescriptionsItem>
            <ADescriptionsItem label="经营类型">
              {{
                selectedBusinessTypes.map((item) => item.name).join('、') || '-'
              }}
            </ADescriptionsItem>
            <ADescriptionsItem label="资质材料" :span="2">
              {{
                requirements
                  .map(
                    (item) =>
                      `${item.name}${getQualification(item.code)?.fileId ? '（已上传）' : '（未上传）'}`,
                  )
                  .join('、') || '-'
              }}
            </ADescriptionsItem>
          </ADescriptions>
          <ACheckbox v-model:checked="confirmed" class="mt-5">
            我确认信息真实、准确，并同意
            <a
              :href="terms.agreementUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              商家服务协议（{{ terms.agreementVersion || '未配置' }}）
            </a>
            及
            <a
              :href="terms.privacyPolicyUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              隐私政策（{{ terms.privacyPolicyVersion || '未配置' }}） </a>。
            <span v-if="!terms.available" class="terms-warning">平台尚未配置正式协议，暂不能提交。</span>
          </ACheckbox>
        </div>

        <div class="action-row">
          <AButton v-if="currentStep > 0" @click="currentStep -= 1">
            上一步
          </AButton>
          <AButton :loading="saving" @click="saveDraft()">保存草稿</AButton>
          <AButton
            v-if="changeMode && application.status === MerchantStatus.APPROVED"
            @click="changeMode = false"
          >
            取消变更
          </AButton>
          <AButton v-if="currentStep < 2" type="primary" @click="goNext">
            下一步
          </AButton>
          <AButton
            v-else
            type="primary"
            :loading="saving"
            @click="handleSubmit"
          >
            {{
              application.status === MerchantStatus.REJECTED
                ? '重新提交审核'
                : '提交审核'
            }}
          </AButton>
        </div>
      </section>

      <section v-else class="application-section locked-section">
        <AResult
          :status="
            effectiveStatus === MerchantStatus.APPROVED
              ? 'success'
              : effectiveStatus === MerchantStatus.FROZEN
                ? 'warning'
                : 'info'
          "
          :title="
            effectiveStatus === MerchantStatus.APPROVED
              ? '入驻申请已通过'
              : effectiveStatus === MerchantStatus.FROZEN
                ? '商家已冻结'
                : '申请正在审核'
          "
          :sub-title="
            effectiveStatus === MerchantStatus.APPROVED
              ? '平台已确认您的经营资质。'
              : effectiveStatus === MerchantStatus.FROZEN
                ? '当前无法进行商品、订单和售后操作。'
                : '平台审核完成后，状态和处理记录会显示在这里。'
          "
        />
        <AButton
          v-if="effectiveStatus === MerchantStatus.APPROVED"
          type="primary"
          @click="startChangeApplication"
        >
          申请变更关键资料
        </AButton>
      </section>

      <section class="history-section">
        <div class="section-title">申请进度</div>
        <ATimeline v-if="history.length" class="timeline">
          <ATimelineItem
            v-for="record in history"
            :key="record.id || `${record.status}-${record.reviewTime}`"
          >
            <div class="timeline-heading">
              <span>第 {{ record.versionNo || '-' }} 版 ·
                {{ statusMap[record.status ?? 0]?.label || '审核记录'
                }}{{ record.type === 'CHANGE' ? ' · 资料变更' : '' }}</span>
              <span>{{
                formatTime(
                  record.reviewTime ||
                    record.submittedTime ||
                    record.createTime,
                )
              }}</span>
            </div>
            <div v-if="record.rejectReason" class="timeline-reason">
              {{ record.rejectReason }}
            </div>
          </ATimelineItem>
        </ATimeline>
        <AEmpty v-else description="暂无审核记录" />
      </section>
    </div>
  </Page>
</template>

<style scoped>
.merchant-workbench {
  max-width: 1120px;
  padding: 24px;
  margin: 0 auto;
}

.status-row {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.status-row h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.status-note,
.review-message {
  margin: 8px 0 0;
  color: var(--muted-foreground);
}

.review-message {
  color: #cf1322;
}

.change-notice {
  margin-bottom: 20px;
  color: #ad6800;
}

.application-section,
.history-section {
  padding: 24px 0;
  border-bottom: 1px solid var(--border);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 24px;
  margin-top: 28px;
}

.qualification-section {
  margin-top: 28px;
}

.qualification-row {
  padding: 20px 0;
  border-bottom: 1px solid var(--border);
}

.qualification-title,
.timeline-heading {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

.qualification-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 24px;
  margin-top: 16px;
}

.confirm-section {
  margin-top: 28px;
}

.action-row {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 24px;
}

.locked-section {
  display: flex;
  justify-content: center;
}

.section-title {
  margin-bottom: 20px;
  font-size: 16px;
  font-weight: 600;
}

.timeline {
  max-width: 760px;
}

.timeline-heading span:first-child {
  font-weight: 500;
}

.timeline-heading span:last-child,
.timeline-reviewer {
  font-size: 12px;
  color: var(--muted-foreground);
}

.timeline-reason {
  margin-top: 8px;
  white-space: pre-wrap;
}

@media (max-width: 720px) {
  .merchant-workbench {
    padding: 16px;
  }

  .form-grid,
  .qualification-fields {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
