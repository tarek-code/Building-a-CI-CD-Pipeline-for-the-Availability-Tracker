# Availability Tracker

A Node.js web application for tracking team availability with Redis persistence and CI/CD pipeline.

## Directory Structure & File Details

### `/public/` - Frontend Web Files

Contains all client-side files served by Express server

- **`index.html`** - Main HTML page with form for selecting team members and their availability status
- **`script.js`** - JavaScript that handles form submissions, sends data to `/save-history` endpoint, loads saved data from `/output/history.json`
- **`styles.css`** - CSS styling for the web interface including status colors and responsive design

### `/input/` - Static Data Files

JSON configuration files used by the frontend

- **`names.json`** - Array of team member names displayed in dropdown menus
- **`selection.json`** - Available selection options for the form
- **`status.json`** - Status definitions with colors and labels (Office, Remote, Sick, etc.)

### `/terraform/` - Infrastructure as Code

Google Cloud Platform infrastructure definitions

- **`main.tf`** - Creates Memorystore Redis instance, VPC Access Connector for Cloud Run to reach Redis, Cloud Run service with Redis URL environment variable

### `/ansible/` - Configuration Management

Automation scripts for server setup

- **`playbook.yml`** - Ansible playbook that installs Docker on EC2 instances, updates packages, starts Docker service

### `/__mocks__/` - Test Utilities

Mock objects for testing

- **`redis.js`** - Mock Redis client used in unit tests to simulate Redis operations without actual Redis connection

### Root Directory Files

#### Core Application

- **`server.js`** - Main Express server that:
  - Serves static files from `/public/` and `/input/`
  - Handles POST `/save-history` - saves data to Redis (if available) and file
  - Handles GET `/output/history.json` - retrieves data from Redis or file fallback
  - Provides GET `/healthz` - health check endpoint for Cloud Run
  - Connects to Redis in background, doesn't block startup
- **`package.json`** - Node.js project configuration with dependencies (express, redis, body-parser) and npm scripts for testing, linting, formatting
- **`package-lock.json`** - Locked dependency versions for reproducible builds

#### Containerization

- **`Dockerfile`** - Multi-stage Docker build:
  - Builder stage: installs production dependencies
  - Runtime stage: copies built app, sets PORT=8080, exposes port 8080, runs `node server.js`
- **`docker-compose.yml`** - Local development setup:
  - `app` service: runs teamavail image on port 3000:8080 with Redis URL
  - `redis` service: Redis 7-alpine with persistent volume

#### Testing

- **`server.unit.test.js`** - Unit tests for `saveHistoryToFile()` and `readHistoryFromFile()` functions
- **`server.integration.test.js`** - Integration tests for Express routes (GET /, POST /save-history, 404 handling)

#### CI/CD Pipeline

- **`Jenkinsfile.cloud`** - Jenkins pipeline that:
  - Checks out code, installs dependencies
  - Runs code quality checks (ESLint, Stylelint, HTMLHint, Prettier)
  - Executes unit and integration tests
  - Builds Docker image, pushes to registry
  - Runs Terraform to deploy to GCP
- **`ci.sh`** - Shell script for CI operations (if used)

#### Infrastructure & Configuration

- **`terraform/main.tf`** - GCP resources:
  - `google_redis_instance` - Memorystore Redis instance
  - `google_vpc_access_connector` - VPC connector for Cloud Run to reach Redis
  - `google_cloud_run_service` - Cloud Run service with Redis URL and VPC annotations
  - `google_cloud_run_service_iam_member` - Public access permissions
- **`eslint.config.mjs`** - ESLint configuration for JavaScript code quality
- **`.stylelintrc.json`** - Stylelint configuration for CSS linting rules

## How It Works

1. **Local Development**: `docker-compose up` runs app on port 3000 with Redis
2. **Cloud Deployment**: Jenkins builds image, pushes to registry, Terraform deploys to Cloud Run with Memorystore Redis
3. **Data Persistence**: Saves to Redis when available, falls back to file storage
4. **VPC Access**: Cloud Run connects to Memorystore via VPC Access Connector

## Quick Start

```bash
# Local development
docker-compose up -d

# Access at http://localhost:3000
```

## Environment Variables

- `PORT` - Server port (default: 8080)
- `REDIS_URL` - Redis connection string (e.g., `redis://host:port`)
- `NODE_ENV` - Environment (production/development)

## What Happened When Starting This Project (Timeline & Fixes)

### Local Environment Setup (CentOS VM on VMware Workstation)
- First, I provisioned a VM running CentOS to host the project locally.
- Cloned the repository and ensured a proper `.gitignore` existed.

![1758737433642](image/README/1758737433642.png)

- Created a `.gitignore` (if missing):

![1758734463140](image/README/1758734463140.png)

- Installed required dependencies. Initially, `npm install` failed due to outdated Node.js and npm.

![1758734509187](image/README/1758734509187.png)

- Upgraded Node.js/npm:
```bash
sudo yum remove -y nodejs npm
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
npm --version && node --version
```
- Re-ran installation and started the app successfully:

![1758734597883](image/README/1758734597883.png)
![1758734621522](image/README/1758734621522.png)

### CI Script (ci.sh)
- Goal: Add formatting, linting, and tests to a single script.
- Formatter: Prettier (works for JS/HTML/CSS)
```bash
npm install --save-dev prettier
```
![1758734682796](image/README/1758734682796.png)
- Added Prettier config:
![1758734707444](image/README/1758734707444.png)
- package.json scripts:
```json
{
  "scripts": {
    "format": "prettier --write \"**/*.{js,html,css,json}\"",
    "format:check": "prettier --check \"**/*.{js,html,css,json}\""
  }
}
```
![1758734720528](image/README/1758734720528.png)
- Usage:
```bash
npm run format:check
npm run format
npx prettier --write public/script.js
```
![1758734734040](image/README/1758734734040.png)

### Linting
- Linters: ESLint (JS), Stylelint (CSS), HTMLHint (HTML)
```bash
npm install --save-dev eslint stylelint stylelint-config-standard htmlhint
npx eslint --init
```
![1758734746098](image/README/1758734746098.png)
![1758734750748](image/README/1758734750748.png)
- Added config files:
![1758734763378](image/README/1758734763378.png)
- package.json scripts:
```json
{
  "scripts": {
    "lint:js": "eslint . --ext .js",
    "lint:css": "stylelint \"**/*.css\"",
    "lint:html": "htmlhint \"**/*.html\"",
    "lint": "npm run lint:js && npm run lint:css && npm run lint:html"
  }
}
```

### Unit & Integration Tests
- Test tools: Jest + Supertest
```bash
npm install --save-dev jest supertest
```
- package.json scripts:
```json
{
  "scripts": {
    "test:unit": "jest *.unit.test.js",
    "test:integration": "jest *.integration.test.js"
  }
}
```
- A background process was binding to port 3000. Identified and disabled it:
```bash
ps -fp <PID>
systemctl list-units | grep my_node_app
sudo systemctl status my_node_app
sudo systemctl stop my_node_app
```
- Ensured `server.js` aligns with tests; then ran:
```bash
npm run test:unit
npm run test:integration
```
![1758735267888](image/README/1758735267888.png)

- ESLint errors for Jest globals (describe/test/expect): added a Jest section to ESLint config:
```json
{
  "files": ["**/*.test.js", "**/*.spec.js"],
  "languageOptions": {
    "globals": {
      "...globals.node": true,
      "...globals.jest": true
    }
  }
}
```

### Docker and Jenkins
- Built Docker image and started via Compose.
- Created a custom Jenkins image to include all pipeline prerequisites.
- Ran Jenkins:
```bash
docker run -d \
  -p 9090:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins-custom:latest
```

#### Disk Space Issue (Resolved)
- Docker reported insufficient space. Extended the VM disk and resized the filesystem:
```text
[root@localhost ~]# sudo fdisk /dev/sda

Welcome to fdisk (util-linux 2.37.4).
Changes will remain in memory only, until you decide to write them.
Be careful before using the write command.

This disk is currently in use - repartitioning is probably a bad idea.
It's recommended to umount all file systems, and swapoff all swap
partitions on this disk.

Command (m for help): p

Disk /dev/sda: 40 GiB, 42949672960 bytes, 83886080 sectors
Disk model: VMware Virtual S
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0xa228537f

Device     Boot   Start      End  Sectors Size Id Type
/dev/sda1  *       2048  2099199  2097152   1G 83 Linux
/dev/sda2       2099200 41943039 39843840  19G 8e Linux LVM

Command (m for help): d
Partition number (1,2, default 2): 2

Partition 2 has been deleted.

Command (m for help): n
Partition type
   p   primary (1 primary, 0 extended, 3 free)
   e   extended (container for logical partitions)
Select (default p): p
Partition number (2-4, default 2): 2
First sector (2099200-83886079, default 2099200):
Last sector, +/-sectors or +/-size{K,M,G,T,P} (2099200-83886079, default 83886079):

Created a new partition 2 of type 'Linux' and of size 39 GiB.
Partition #2 contains a LVM2_member signature.

Do you want to remove the signature? [Y]es/[N]o: N

Command (m for help): t
Partition number (1,2, default 2): 2
Hex code or alias (type L to list all): L

00 Empty            24 NEC DOS          81 Minix / old Lin  bf Solaris
01 FAT12            27 Hidden NTFS Win  82 Linux swap / So  c1 DRDOS/sec (FAT-
02 XENIX root       39 Plan 9           83 Linux            c4 DRDOS/sec (FAT-
03 XENIX usr        3c PartitionMagic   84 OS/2 hidden or   c6 DRDOS/sec (FAT-
04 FAT16 <32M       40 Venix 80286      85 Linux extended   c7 Syrinx
05 Extended         41 PPC PReP Boot    86 NTFS volume set  da Non-FS data
06 FAT16            42 SFS              87 NTFS volume set  db CP/M / CTOS / .
07 HPFS/NTFS/exFAT  4d QNX4.x           88 Linux plaintext  de Dell Utility
08 AIX              4e QNX4.x 2nd part  8e Linux LVM        df BootIt
09 AIX bootable     4f QNX4.x 3rd part  93 Amoeba           e1 DOS access
0a OS/2 Boot Manag  50 OnTrack DM       94 Amoeba BBT       e3 DOS R/O
0b W95 FAT32        51 OnTrack DM6 Aux  9f BSD/OS           e4 SpeedStor
0c W95 FAT32 (LBA)  52 CP/M             a0 IBM Thinkpad hi  ea Linux extended
0e W95 FAT16 (LBA)  53 OnTrack DM6 Aux  a5 FreeBSD          eb BeOS fs
0f W95 Ext'd (LBA)  54 OnTrackDM6       a6 OpenBSD          ee GPT
10 OPUS             55 EZ-Drive         a7 NeXTSTEP         ef EFI (FAT-12/16/
11 Hidden FAT12     56 Golden Bow       a8 Darwin UFS       f0 Linux/PA-RISC b
12 Compaq diagnost  5c Priam Edisk      a9 NetBSD           f1 SpeedStor
14 Hidden FAT16 <3  61 SpeedStor        ab Darwin boot      f4 SpeedStor
16 Hidden FAT16     63 GNU HURD or Sys  af HFS / HFS+       f2 DOS secondary
17 Hidden HPFS/NTF  64 Novell Netware   b7 BSDI fs          fb VMware VMFS
18 AST SmartSleep   65 Novell Netware   b8 BSDI swap        fc VMware VMKCORE
1b Hidden W95 FAT3  70 DiskSecure Mult  bb Boot Wizard hid  fd Linux raid auto
1c Hidden W95 FAT3  75 PC/IX            bc Acronis FAT32 L  fe LANstep
1e Hidden W95 FAT1  80 Old Minix        be Solaris boot     ff BBT

Aliases:
   linux          - 83
   swap           - 82
   extended       - 05
   uefi           - EF
   raid           - FD
   lvm            - 8E
   linuxex        - 85
Hex code or alias (type L to list all): 8E

Changed type of partition 'Linux' to 'Linux LVM'.

Command (m for help): w
The partition table has been altered.
Syncing disks.

[root@localhost ~]# sudo partprobe /dev/sda
[root@localhost ~]# lsblk
NAME        MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS
sda           8:0    0    40G  0 disk
├─sda1        8:1    0     1G  0 part /boot
└─sda2        8:2    0    39G  0 part
  ├─cs-root 253:0    0    17G  0 lvm  /
  └─cs-swap 253:1    0     2G  0 lvm  [SWAP]
sr0          11:0    1 157.8M  0 rom
sr1          11:1    1  10.6G  0 rom
[root@localhost ~]# sudo pvresize /dev/sda2
  Physical volume "/dev/sda2" changed
  1 physical volume(s) resized or updated / 0 physical volume(s) not resized
[root@localhost ~]# sudo lvextend -l +100%FREE /dev/mapper/cs-root
  Size of logical volume cs/root changed from <17.00 GiB (4351 extents) to <37.00 GiB (9471 extents).
  Logical volume cs/root successfully resized.
[root@localhost ~]# sudo xfs_growfs /
meta-data=/dev/mapper/cs-root    isize=512    agcount=4, agsize=1113856 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=1, sparse=1, rmapbt=0
         =                       reflink=1    bigtime=1 inobtcount=1 nrext64=0
data     =                       bsize=4096   blocks=4455424, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0, ftype=1
log      =internal log           bsize=4096   blocks=16384, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0
data blocks changed from 4455424 to 9698304
[root@localhost ~]# df -h /
Filesystem           Size  Used Avail Use% Mounted on
/dev/mapper/cs-root   37G   17G   21G  46% /
[root@localhost ~]#
```

- Relaunched Jenkins successfully:
```bash
docker run -d -p 9090:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins-custom:latest
```

#### GitHub Webhook (Local env via ngrok)
- Used ngrok to expose Jenkins locally for GitHub webhooks:
```bash
ngrok http 9090
```
![1758735780021](image/README/1758735780021.png)
![1758735815741](image/README/1758735815741.png)
![1758735828605](image/README/1758735828605.png)
![1758735836433](image/README/1758735836433.png)

- Set up a Jenkins pipeline (alternative to `ci.sh`). After running it, the project was available at localhost:8080.
![1758735924041](image/README/1758735924041.png)

### Cloud Deployment (GCP via Terraform)
- Wrote Terraform to provision:
  - Serverless VPC Access connector (to reach Memorystore from Cloud Run)
  - Memorystore (Redis) instance for persistence
  - Cloud Run service to host the container image
- Jenkins builds and pushes the Docker image, then runs Terraform to deploy infra.
![1758736453805](image/README/1758736453805.png)
- Enabled required GCP services (e.g., Redis API) before running the pipeline.
![1758736566206](image/README/1758736566206.png)
- Deployed resources (Redis + Cloud Run) via Terraform:
![1758736607904](image/README/1758736607904.png)
![1758736613280](image/README/1758736613280.png)
![1758736622162](image/README/1758736622162.png)
![1758736634750](image/README/1758736634750.png)
- Accessed the Cloud Run URL; data is saved in Redis.
![1758736666603](image/README/1758736666603.png)

### Key Issues and Resolutions (Recap)
- Cloud Run failed to become ready (PORT 8080):
  - Cause: Server attempted Redis connect during startup and bound only after success.
  - Fix: `server.js` now listens immediately on `0.0.0.0:${PORT}` and connects to Redis in the background; added `/healthz`.

- Container failed health checks due to PORT mismatch:
  - Cause: Cloud Run expects 8080; clarified app PORT logic and Dockerfile exposes 8080.
  - Fix: Ensure no custom PORT in Cloud Run; compose maps host 3000 → container 8080 for local use.

- Terraform used `REDIS_HOST`/`REDIS_PORT` (unused by app):
  - Fix: Switched to `REDIS_URL=redis://<memorystore-ip>:6379` in Cloud Run env.

- Cloud Run couldn’t reach Redis (private IP):
  - Cause: No Serverless VPC Access connector.
  - Fix: Added `google_vpc_access_connector` and Cloud Run annotations; ensured same region/network.

- VPC connector API/quotas/states:
  - Error: Connector required min/max instances; set `min_instances=2`, `max_instances=2`.
  - Error: Existing broken connector → 409/bad state.
  - Fix: Delete broken connector, recreate with non-overlapping `/28` range (e.g., `10.9.0.0/28`).

- IAM/API permissions during Terraform:
  - Error: `run.services.setIamPolicy` denied and Cloud Resource Manager API disabled.
  - Fix: Enable APIs (`run`, `vpcaccess`, `redis`, `cloudresourcemanager`) and grant roles to Jenkins SA (`run.admin`, `iam.serviceAccountUser`, `vpcaccess.user`).

- Local Docker Compose networking:
  - Updated compose to map host `3000:8080`; removed PORT env so app defaults to 8080.
  - Use `REDIS_URL=redis://redis:6379` to reach the Redis service.

- Lint/test issues:
  - ESLint `no-empty` fixed; CSS vendor prefixes simplified; tests passing (unit + integration).

With these fixes, local and cloud deployments run reliably, and data persists in Redis when `REDIS_URL` is configured.
