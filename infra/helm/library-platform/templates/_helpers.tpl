{{/*
Shared building blocks for the chart's templates.
*/}}

{{/* A component's resource name, prefixed with the release: e.g. "library-book-service". */}}
{{- define "lp.name" -}}
{{- printf "%s-%s" .root.Release.Name .component | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Labels that select a component's pods. Never change these on an existing install. */}}
{{- define "lp.selectorLabels" -}}
app.kubernetes.io/name: {{ .component }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- end -}}

{{/* All standard labels for a component. */}}
{{- define "lp.labels" -}}
{{ include "lp.selectorLabels" . }}
app.kubernetes.io/part-of: library-platform
app.kubernetes.io/version: {{ .root.Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .root.Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .root.Chart.Name .root.Chart.Version }}
{{- end -}}

{{/* Full image reference for one of the platform's images. */}}
{{- define "lp.image" -}}
{{- printf "%s/%s:%s" .root.Values.image.registry .component .root.Values.image.tag -}}
{{- end -}}

{{/* In-cluster address of a component's Service, e.g. http://library-book-service:8080. */}}
{{- define "lp.url" -}}
{{- printf "http://%s:%v" (include "lp.name" .) .port -}}
{{- end -}}

{{/*
Same, but fully qualified. nginx looks names up itself and doesn't use the cluster's
search domains, so the gateway needs the full name.
*/}}
{{- define "lp.fqdnUrl" -}}
{{- printf "http://%s.%s.svc.cluster.local:%v" (include "lp.name" .) .root.Release.Namespace .port -}}
{{- end -}}

{{/* MongoDB connection string for one service's database. */}}
{{- define "lp.mongodbUri" -}}
{{- if .root.Values.mongodb.enabled -}}
{{- printf "mongodb://%s:27017/%s" (include "lp.name" (dict "root" .root "component" "mongodb")) .database -}}
{{- else -}}
{{- required "mongodb.externalUri is required when mongodb.enabled is false" .root.Values.mongodb.externalUri | trimSuffix "/" -}}/{{ .database }}
{{- end -}}
{{- end -}}

{{/*
Pod-level security: never run as root, and use the runtime's default seccomp profile,
which blocks system calls ordinary apps never need.
*/}}
{{- define "lp.podSecurityContext" -}}
runAsNonRoot: true
runAsUser: {{ .uid }}
runAsGroup: {{ .uid }}
fsGroup: {{ .uid }}
seccompProfile:
  type: RuntimeDefault
{{- end -}}

{{/*
Container-level security: a read-only filesystem (nothing can be modified or dropped in
at runtime), no privilege escalation, and no Linux capabilities at all.
*/}}
{{- define "lp.containerSecurityContext" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: true
capabilities:
  drop: [ALL]
{{- end -}}

{{/* A NetworkPolicy "from" entry that matches one component's pods. */}}
{{- define "lp.from" -}}
- podSelector:
    matchLabels:
      {{- include "lp.selectorLabels" . | nindent 6 }}
{{- end -}}
